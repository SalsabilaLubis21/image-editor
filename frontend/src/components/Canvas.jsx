import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box, CircularProgress } from "@mui/material";

const Canvas = forwardRef(
  (
    {
      image,
      drawing,
      loading,
      onDrawingComplete,
      maskMode,
      onMaskComplete,
      mode = "view",
      onCropComplete,
      adjustments,
      drawingColor: propDrawingColor,
      drawingText: propDrawingText,
      drawingSize: propDrawingSize,
      layers = [],
      activeLayerIndex = 0,
    },
    ref
  ) => {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingTool, setDrawingTool] = useState(null);
    const [drawingColor, setDrawingColor] = useState("#000000");
    const [drawingSize, setDrawingSize] = useState(5);
    const [drawingText, setDrawingText] = useState("Text");
    const [context, setContext] = useState(null);
    const [drawingContext, setDrawingContext] = useState(null);
    const [maskContext, setMaskContext] = useState(null);

    const [isDrawingShape, setIsDrawingShape] = useState(false);
    const [shapeStart, setShapeStart] = useState(null);

    // Crop state
    const [isCropping, setIsCropping] = useState(false);
    const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
    const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
    const [cropOverlay, setCropOverlay] = useState(null);
    const [scaleX, setScaleX] = useState(1);
    const [scaleY, setScaleY] = useState(1);

    const getCompositedDataURL = () => {
      if (!canvasRef.current || !drawingCanvasRef.current) return null;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(canvasRef.current, 0, 0);
      tempCtx.drawImage(drawingCanvasRef.current, 0, 0);
      return tempCanvas.toDataURL("image/png");
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      setDrawingTool: (tool) => setDrawingTool(tool),
      setDrawingColor: (color) => setDrawingColor(color),
      setDrawingSize: (size) => setDrawingSize(size),
      getImageData: () => getCompositedDataURL(),
      getCanvasElement: () => canvasRef.current, // Added this function
      getMaskData: () => {
        if (maskCanvasRef.current) {
          return maskCanvasRef.current.toDataURL("image/png");
        }
        return null;
      },
      clearCanvas: () => {
        if (drawingContext && drawingCanvasRef.current) {
          drawingContext.clearRect(
            0,
            0,
            drawingCanvasRef.current.width,
            drawingCanvasRef.current.height
          );
        }
      },
      clearMask: () => {
        if (maskContext && maskCanvasRef.current) {
          maskContext.fillStyle = "black";
          maskContext.fillRect(
            0,
            0,
            maskCanvasRef.current.width,
            maskCanvasRef.current.height
          );
        }
      },
    }));

    useEffect(() => {
      if (propDrawingColor !== undefined) {
        setDrawingColor(propDrawingColor);
      }
    }, [propDrawingColor]);

    useEffect(() => {
      if (propDrawingText !== undefined) {
        setDrawingText(propDrawingText);
      }
    }, [propDrawingText]);

    useEffect(() => {
      if (propDrawingSize !== undefined) {
        setDrawingSize(propDrawingSize);
      }
    }, [propDrawingSize]);

    // Initialize canvas context
    useEffect(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        setContext(ctx);
      }
      if (drawingCanvasRef.current) {
        const ctx = drawingCanvasRef.current.getContext("2d");
        setDrawingContext(ctx);
      }
      if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext("2d");
        ctx.fillStyle = "black";
        ctx.fillRect(
          0,
          0,
          maskCanvasRef.current.width,
          maskCanvasRef.current.height
        );
        setMaskContext(ctx);
      }
    }, []);

    // Composite layers onto canvas when layers change
    useEffect(() => {
      if (layers.length > 0 && context && canvasRef.current) {
        const baseLayer = layers[0];
        const img = new Image();
        img.onload = () => {
          // Set canvas dimensions to match image
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;

          // Calculate scale factors
          const rect = canvasRef.current.getBoundingClientRect();
          setScaleX(img.width / (rect.width || 1));
          setScaleY(img.height / (rect.height || 1));

          // Load all visible layer images
          const visibleLayers = layers.filter((layer) => layer.visible);
          const loadPromises = visibleLayers.map((layer) => {
            return new Promise((resolve) => {
              const layerImg = new Image();
              layerImg.onload = () =>
                resolve({ img: layerImg, opacity: layer.opacity });
              layerImg.src = layer.image;
            });
          });

          Promise.all(loadPromises).then((loadedLayers) => {
            // Composite all visible layers
            context.clearRect(0, 0, img.width, img.height);
            loadedLayers.forEach(({ img: layerImg, opacity }) => {
              context.globalAlpha = opacity / 100;
              context.drawImage(layerImg, 0, 0);
              context.globalAlpha = 1; // Reset alpha
            });
          });

          // Set drawing canvas dimensions
          if (drawingCanvasRef.current) {
            drawingCanvasRef.current.width = img.width;
            drawingCanvasRef.current.height = img.height;
          }

          // Set mask canvas dimensions
          if (maskCanvasRef.current) {
            maskCanvasRef.current.width = img.width;
            maskCanvasRef.current.height = img.height;
            if (maskContext) {
              maskContext.fillStyle = "black";
              maskContext.fillRect(0, 0, img.width, img.height);
            }
          }
        };
        img.src = baseLayer.image;
      }
    }, [layers, context, maskContext, drawingContext]);

    useEffect(() => {
      if (drawingContext && drawingCanvasRef.current) {
        drawingContext.clearRect(
          0,
          0,
          drawingCanvasRef.current.width,
          drawingCanvasRef.current.height
        );
        if (drawing) {
          const drawingImg = new Image();
          drawingImg.onload = () => {
            drawingContext.drawImage(drawingImg, 0, 0);
          };
          drawingImg.src = drawing;
        }
      }
    }, [drawing, drawingContext]);

    // Drawing functions
    const startDrawing = (e) => {
      if (loading) return;
      if (!drawingTool && !maskMode) return;

      setIsDrawing(true);
      const rect = canvasRef.current.getBoundingClientRect();
      const posX = e.clientX - rect.left;
      const posY = e.clientY - rect.top;
      const scaledX = posX * scaleX;
      const scaledY = posY * scaleY;

      if (maskMode) {
        maskContext.beginPath();
        maskContext.moveTo(scaledX, scaledY);
        maskContext.strokeStyle = "white";
        maskContext.lineWidth = drawingSize;
        maskContext.lineCap = "round";
      } else {
        if (drawingTool === "freehand" || drawingTool === "eraser") {
          drawingContext.beginPath();
          drawingContext.moveTo(scaledX, scaledY);
          drawingContext.globalCompositeOperation =
            drawingTool === "eraser" ? "destination-out" : "source-over";
          if (drawingTool !== "eraser") {
            drawingContext.strokeStyle = drawingColor;
          }
          drawingContext.lineWidth = drawingSize;
          drawingContext.lineCap = "round";
        } else if (
          [
            "rectangle",
            "circle",
            "oval",
            "triangle",
            "text",
            "fill",
            "line",
          ].includes(drawingTool)
        ) {
          setShapeStart({ x: scaledX, y: scaledY });
          setIsDrawingShape(true);
        }
      }
    };

    const draw = (e) => {
      if (!isDrawing || loading) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const posX = e.clientX - rect.left;
      const posY = e.clientY - rect.top;
      const scaledX = posX * scaleX;
      const scaledY = posY * scaleY;

      if (maskMode) {
        maskContext.lineTo(scaledX, scaledY);
        maskContext.stroke();
      } else if (drawingTool === "freehand" || drawingTool === "eraser") {
        drawingContext.lineTo(scaledX, scaledY);
        drawingContext.stroke();
      }
    };

    const stopDrawing = (e) => {
      if (!isDrawing) return;

      setIsDrawing(false);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const posX = e.clientX - rect.left;
      const posY = e.clientY - rect.top;
      const scaledX = posX * scaleX;
      const scaledY = posY * scaleY;

      if (maskMode) {
        maskContext.closePath();
        if (onMaskComplete) {
          onMaskComplete(maskCanvasRef.current.toDataURL("image/png"));
        }
      } else if (drawingTool === "freehand" || drawingTool === "eraser") {
        drawingContext.globalCompositeOperation = "source-over";
      } else if (isDrawingShape) {
        const startX = shapeStart.x;
        const startY = shapeStart.y;
        drawingContext.globalCompositeOperation =
          drawingTool === "eraser" ? "destination-out" : "source-over";
        if (drawingTool !== "eraser") {
          drawingContext.fillStyle = drawingColor;
          drawingContext.strokeStyle = drawingColor;
        }
        drawingContext.lineWidth = drawingSize;
        if (drawingTool === "rectangle") {
          const width = scaledX - startX;
          const height = scaledY - startY;
          if (Math.abs(width) > 0 && Math.abs(height) > 0) {
            drawingContext.fillRect(startX, startY, width, height);
          }
        } else if (drawingTool === "circle") {
          const centerX = (startX + scaledX) / 2;
          const centerY = (startY + scaledY) / 2;
          const radius = Math.hypot(scaledX - startX, scaledY - startY) / 2;
          if (radius > 0) {
            drawingContext.beginPath();
            drawingContext.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            drawingContext.fill();
          }
        } else if (drawingTool === "text") {
          drawingContext.font = "bold 40px Arial";
          drawingContext.textAlign = "left";
          drawingContext.textBaseline = "top";
          drawingContext.fillText(drawingText, startX, startY);
        } else if (drawingTool === "oval") {
          const centerX = (startX + scaledX) / 2;
          const centerY = (startY + scaledY) / 2;
          const radiusX = Math.abs(scaledX - startX) / 2;
          const radiusY = Math.abs(scaledY - startY) / 2;
          if (radiusX > 0 && radiusY > 0) {
            drawingContext.beginPath();
            drawingContext.ellipse(
              centerX,
              centerY,
              radiusX,
              radiusY,
              0,
              0,
              2 * Math.PI
            );
            drawingContext.fill();
          }
        } else if (drawingTool === "triangle") {
          const points = [
            { x: startX, y: startY },
            { x: scaledX, y: scaledY },
            {
              x: startX + (scaledX - startX) / 2,
              y: startY - Math.abs(scaledY - startY),
            },
          ];
          drawingContext.beginPath();
          drawingContext.moveTo(points[0].x, points[0].y);
          drawingContext.lineTo(points[1].x, points[1].y);
          drawingContext.lineTo(points[2].x, points[2].y);
          drawingContext.closePath();
          drawingContext.fill();
        } else if (drawingTool === "line") {
          if (drawingTool !== "eraser") {
            drawingContext.strokeStyle = drawingColor;
          }
          drawingContext.lineWidth = drawingSize;
          drawingContext.beginPath();
          drawingContext.moveTo(startX, startY);
          drawingContext.lineTo(scaledX, scaledY);
          drawingContext.stroke();
        } else if (drawingTool === "fill") {
          const dCtx = drawingContext;
          if (!dCtx || !drawingCanvasRef.current) return;

          const clickX = Math.round(shapeStart.x);
          const clickY = Math.round(shapeStart.y);
          const fillColor = hexToRgba(drawingColor);

          const width = drawingCanvasRef.current.width;
          const height = drawingCanvasRef.current.height;

          const imageData = dCtx.getImageData(0, 0, width, height);
          const data = imageData.data;

          const targetColor = getPixelColor(data, clickX, clickY, width);

          // Only fill transparent areas.
          if (targetColor[3] === 0) {
            const stack = [[clickX, clickY]];

            while (stack.length) {
              const [x, y] = stack.pop();

              if (!isValidPixel(x, y, width, height)) continue;

              const pixelIndex = (y * width + x) * 4;

              // If pixel is not transparent (already filled or a boundary), skip.
              if (data[pixelIndex + 3] > 0) continue;

              // Fill the pixel
              data[pixelIndex] = fillColor[0];
              data[pixelIndex + 1] = fillColor[1];
              data[pixelIndex + 2] = fillColor[2];
              data[pixelIndex + 3] = fillColor[3];

              stack.push([x + 1, y]);
              stack.push([x - 1, y]);
              stack.push([x, y + 1]);
              stack.push([x, y - 1]);
            }
            dCtx.putImageData(imageData, 0, 0);
          }

          if (onDrawingComplete) {
            onDrawingComplete(drawingCanvasRef.current.toDataURL("image/png"));
          }

          setIsDrawingShape(false);
          setShapeStart(null);
          return;
        }
        setIsDrawingShape(false);
        setShapeStart(null);
        drawingContext.globalCompositeOperation = "source-over";
      }

      if (onDrawingComplete && !maskMode) {
        onDrawingComplete(drawingCanvasRef.current.toDataURL("image/png"));
      }
    };

    // Crop functions
    const startCrop = (e) => {
      if (mode !== "crop" || loading) return;

      setIsCropping(true);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCropStart({ x, y });
      setCropEnd({ x, y });
    };

    const updateCrop = (e) => {
      if (!isCropping || mode !== "crop") return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCropEnd({ x, y });
    };

    const finishCrop = () => {
      if (!isCropping || mode !== "crop") return;

      const x = Math.min(cropStart.x, cropEnd.x) * scaleX;
      const y = Math.min(cropStart.y, cropEnd.y) * scaleY;
      const width = Math.abs(cropEnd.x - cropStart.x) * scaleX;
      const height = Math.abs(cropEnd.y - cropStart.y) * scaleY;

      if (onCropComplete && width > 0 && height > 0) {
        onCropComplete({
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        });
      }

      setIsCropping(false);
      setCropOverlay(null);
    };

    const hexToRgba = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b, 255];
    };

    const getPixelColor = (data, x, y, width) => {
      const index = (y * width + x) * 4;
      return [data[index], data[index + 1], data[index + 2], data[index + 3]];
    };

    const setPixelColor = (data, x, y, color, width) => {
      const index = (y * width + x) * 4;
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = color[3];
    };

    const colorsMatch = (c1, c2) => {
      return (
        Math.abs(c1[0] - c2[0]) < 10 &&
        Math.abs(c1[1] - c2[1]) < 10 &&
        Math.abs(c1[2] - c2[2]) < 10 &&
        Math.abs(c1[3] - c2[3]) < 10
      );
    };

    const isValidPixel = (x, y, width, height) =>
      x >= 0 && x < width && y >= 0 && y < height;



    // Clear crop when mode changes
    useEffect(() => {
      if (mode !== "crop") {
        setIsCropping(false);
        setCropOverlay(null);
      }
    }, [mode]);

    // Update crop overlay
    useEffect(() => {
      if (isCropping) {
        const x = Math.min(cropStart.x, cropEnd.x);
        const y = Math.min(cropStart.y, cropEnd.y);
        const width = Math.abs(cropEnd.x - cropStart.x);
        const height = Math.abs(cropEnd.y - cropStart.y);
        setCropOverlay({ x, y, width, height });
      } else {
        setCropOverlay(null);
      }
    }, [isCropping, cropStart, cropEnd]);

    return (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              zIndex: 10,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            if (mode === "crop") {
              startCrop(e);
            } else {
              startDrawing(e);
            }
          }}
          onMouseMove={(e) => {
            if (mode === "crop") {
              updateCrop(e);
            } else {
              draw(e);
            }
          }}
          onMouseUp={(e) => {
            if (mode === "crop") {
              finishCrop();
            } else {
              stopDrawing(e);
            }
          }}
          onMouseLeave={(e) => {
            if (mode === "crop") {
              finishCrop();
            } else {
              stopDrawing(e);
            }
          }}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            display: "block",
            filter: adjustments
              ? `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) hue-rotate(${adjustments.hue}deg)`
              : undefined,
            transform: adjustments
              ? `scale(${
                  (adjustments.scale / 100) * (adjustments.flipH ? -1 : 1)
                }, ${
                  (adjustments.scale / 100) * (adjustments.flipV ? -1 : 1)
                }) rotate(${adjustments.rotate}deg)`
              : undefined,
            transformOrigin: "center",
          }}
        />
        <canvas
          ref={drawingCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            maxWidth: "100%",
            maxHeight: "100%",
            display: "block",
            pointerEvents: "none",
            opacity: 0.5,
          }}
        />
        {maskMode && (
          <canvas
            ref={maskCanvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              maxWidth: "100%",
              maxHeight: "100%",
              display: "block",
              opacity: 0.5,
              pointerEvents: "auto",
            }}
          />
        )}
        {cropOverlay && (
          <div
            style={{
              position: "absolute",
              left: cropOverlay.x,
              top: cropOverlay.y,
              width: cropOverlay.width,
              height: cropOverlay.height,
              border: "2px dashed #fff",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              pointerEvents: "none",
            }}
          />
        )}
      </Box>
    );
  }
);

export default Canvas;
