from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import cv2
import os
import numpy as np
import io
import sys
import traceback
import json
from PIL import Image

# this is to import from utils folder
from utils import super_resolution, background_removal, automatic_color_correction, color_adjustments

app = Flask(__name__)
CORS(app)

@app.route('/api/upload', methods=['POST'])
def upload_image():
    try:
        file = request.files.get('image')
        if not file:
            return "No image file provided", 400

        # Use PIL to handle EXIF orientation automatically
        pil_image = Image.open(io.BytesIO(file.read()))
        # Convert to RGB if necessary
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        print(f"[DEBUG] Uploaded image size: {pil_image.size}", flush=True)

        # Save as PNG using PIL
        output_buffer = io.BytesIO()
        pil_image.save(output_buffer, format='PNG')
        output_buffer.seek(0)
        return send_file(output_buffer, mimetype='image/png')

    except Exception as e:
        print("[ERROR] Exception in upload_image:", e, flush=True)
        traceback.print_exc()
        return str(e), 500
@app.route('/api/edit', methods=['POST'])
def edit_image():
    import time
    start_time = time.time()

    try:
        file = request.files.get('image')
        if not file:
            return "No image file provided", 400

        operation = request.form.get('operation')
        if not operation:
            return "No operation specified", 400

        nparr = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        print(f"[DEBUG] Received image shape: {image.shape}", flush=True)

        result = None
        if operation == 'background_removal':
            result = background_removal.remove_background(image)
        elif operation == 'auto_color':
            result = automatic_color_correction.color_correct(image)
        elif operation == 'adjustments':
            params = json.loads(request.form.get('params', '{}'))
            result = image.copy()
            if 'brightness' in params:
                result = color_adjustments.brightness(result, params['brightness'] / 100.0)
            if 'contrast' in params:
                result = color_adjustments.contrast(result, params['contrast'] / 100.0)
            if 'saturation' in params:
                result = color_adjustments.saturation(result, params['saturation'] / 100.0)
            if 'hue' in params:
                result = color_adjustments.hue(result, params['hue'])
            if result is None:
                return "Image processing failed", 500
        elif '.' in operation:
            category, func_name = operation.split('.', 1)
            try:
                if category == 'super_resolution' and func_name == 'realesrgan':
                    from utils import super_resolution
                    result = super_resolution.super_resolve(image)
                else:
                    module = __import__('utils.' + category, fromlist=[func_name])
                    func = getattr(module, func_name)
                    params = json.loads(request.form.get('params', '{}'))
                    result = func(image, **params)
                
                if result is not None and len(result.shape) == 2:
                    result = cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)
            except Exception as e:
                import traceback
                print("[ERROR] Exception in dynamic operation:", flush=True)
                traceback.print_exc()
                return f"Error in {operation}: {e}", 500
        else:
            return "Invalid operation specified", 400

        if result is None:
             return "Image processing failed", 500

        
        try:
            _, buffer = cv2.imencode('.png', result)
            print(f"[DEBUG] Output buffer size: {len(buffer)} bytes", flush=True)
        except Exception as e:
            import traceback
            print("[ERROR] Failed to encode PNG:", flush=True)
            traceback.print_exc()
            return f"Failed to encode PNG: {e}", 500

        elapsed_time = time.time() - start_time
        print(f"[DEBUG] Total processing time: {elapsed_time:.2f}s", flush=True)

        return send_file(io.BytesIO(buffer.tobytes()), mimetype='image/png')

    except Exception as e:
        import traceback
        print("[ERROR] Unexpected exception in /api/edit:", flush=True)
        traceback.print_exc()
        return str(e), 500

@app.route('/api/image/create_empty_layer', methods=['POST'])
def create_empty_layer():
    try:
        width = int(request.form.get('width', 800))
        height = int(request.form.get('height', 600))
        # to Create empty white image
        image = np.ones((height, width, 3), dtype=np.uint8) * 255
        _, buffer = cv2.imencode('.png', image)
        return send_file(io.BytesIO(buffer.tobytes()), mimetype='image/png')
    except Exception as e:
        print("[ERROR] Exception in create_empty_layer:", e, flush=True)
        traceback.print_exc()
        return str(e), 500

@app.route('/api/batch/open_image', methods=['POST'])
def open_image():
    try:
        image_path = request.form.get('image_path')
        if not image_path:
            return "No image path provided", 400

        from utils import batch_processor
        image = batch_processor.open_image(image_path)

        # Convert PIL to numpy array for cv2 encoding
        image_np = np.array(image)
        if len(image_np.shape) == 2:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_GRAY2BGR)
        elif image_np.shape[2] == 4:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2BGR)

        _, buffer = cv2.imencode('.png', image_np)
        return send_file(io.BytesIO(buffer.tobytes()), mimetype='image/png')

    except Exception as e:
        print("[ERROR] Exception in open_image:", e, flush=True)
        traceback.print_exc()
        return str(e), 500

@app.route('/api/batch/save_image', methods=['POST'])
def save_image():
    try:
        file = request.files.get('image')
        if not file:
            return "No image file provided", 400

        save_path = request.form.get('save_path')
        if not save_path:
            return "No save path provided", 400

        format_type = request.form.get('format', 'PNG')

        nparr = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Convert to PIL Image
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        from utils import batch_processor
        saved_path = batch_processor.save_image(pil_image, format_type)

        return jsonify({"message": f"Image saved successfully to {saved_path}"}), 200

    except Exception as e:
        print("[ERROR] Exception in save_image:", e, flush=True)
        traceback.print_exc()
        return str(e), 500

@app.route('/api/batch/export_image', methods=['POST'])
def export_image():
    try:
        file = request.files.get('image')
        if not file:
            return "No image file provided", 400

        format_type = request.form.get('format', 'PNG')

        nparr = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Convert to PIL Image
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        from utils import batch_processor
        image_bytes = batch_processor.export_image(pil_image, format_type)

        return send_file(io.BytesIO(image_bytes), mimetype=f'image/{format_type.lower()}')

    except Exception as e:
        print("[ERROR] Exception in export_image:", e, flush=True)
        traceback.print_exc()
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True)
