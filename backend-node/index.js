const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = 3000;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/api/health', (req, res) => {
    res.json({ status: 'Node.js middleware is running!' });
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const pythonApiUrl = 'http://localhost:5000/api/process';
        const response = await axios.post(pythonApiUrl, formData, {
            headers: {
                ...formData.getHeaders()
            },
            responseType: 'arraybuffer'
        });

        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);

    } catch (error) {
        console.error('Error forwarding file to Python backend:');
        let errorMessage = 'An unknown error occurred while processing the image.';
        if (error.response) {
            // The server responded with a status code outside the 2xx range
            console.error('Backend Error Data:', error.response.data);
            console.error('Backend Error Status:', error.response.status);
            // The error from the Python backend is often a buffer, convert it to a string.
            errorMessage = error.response.data.toString() || 'Error from Python backend.';
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response from backend:', error.request);
            errorMessage = 'No response received from Python backend. It might be down or taking too long.';
        } else {
            // Something else happened
            console.error('Axios Error:', error.message);
            errorMessage = error.message;
        }
        res.status(500).send(errorMessage);
    }
});

app.listen(port, () => {
    console.log(`Node.js middleware listening at http://localhost:${port}`);
});