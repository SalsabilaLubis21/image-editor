import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { API_BASE_URL } from "../config";
import Canvas from "./Canvas";

const ImageEditor = () => {
  const [imageFile, setImageFile] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("view");
  const [drawingColor, setDrawingColor] = useState("#000000");
  const [drawingText, setDrawingText] = useState("Text");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      setProcessedImage(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleImageEdit = async (operation, params = {}) => {
    if (!imageFile) {
      setError("Please upload an image first");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("operation", operation);
      formData.append("params", JSON.stringify(params));

      const controller = new AbortController();
      const timeoutMs = operation === "super_resolution" ? 600000 : 300000; // 10 minutes for super_resolution, 5 for others
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${API_BASE_URL}/api/edit`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to process image");
      }

      const result = await response.blob();
      setProcessedImage(URL.createObjectURL(result));
    } catch (error) {
      if (error.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const basicTools = [
    {
      category: "Geometric Transformations",
      operations: [
        {
          name: "Crop",
          handler: () => handleImageEdit("geometric_transformations.crop"),
        },
        {
          name: "Resize",
          handler: () => handleImageEdit("geometric_transformations.resize"),
        },
        {
          name: "Rotate",
          handler: () => handleImageEdit("geometric_transformations.rotate"),
        },
        {
          name: "Flip Horizontal",
          handler: () =>
            handleImageEdit("geometric_transformations.flip_horizontal"),
        },
        {
          name: "Flip Vertical",
          handler: () =>
            handleImageEdit("geometric_transformations.flip_vertical"),
        },
        {
          name: "Perspective Transform",
          handler: () =>
            handleImageEdit("geometric_transformations.perspective_transform"),
        },
      ],
    },
    {
      category: "Color Adjustments",
      operations: [
        {
          name: "Brightness",
          handler: () => handleImageEdit("color_adjustments.brightness"),
        },
        {
          name: "Contrast",
          handler: () => handleImageEdit("color_adjustments.contrast"),
        },
        {
          name: "Saturation",
          handler: () => handleImageEdit("color_adjustments.saturation"),
        },
        {
          name: "Histogram Equalization",
          handler: () => handleImageEdit("color_adjustments.histogram_eq"),
        },
      ],
    },
    {
      category: "Filters",
      operations: [
        {
          name: "Gaussian Blur",
          handler: () =>
            handleImageEdit("filtering_and_noise_removal.gaussian_blur"),
        },
        {
          name: "Sharpen",
          handler: () => handleImageEdit("filtering_and_noise_removal.sharpen"),
        },
        {
          name: "Edge Detection",
          handler: () =>
            handleImageEdit("filtering_and_noise_removal.edge_detection"),
        },

        {
          name: "Median Filter",
          handler: () =>
            handleImageEdit("filtering_and_noise_removal.median_filter"),
        },
      ],
    },
  ];

  const aiFeatures = [
    {
      name: "Background Removal",
      handler: () => handleImageEdit("background_removal.remove_background"),
    },
    {
      name: "Super Resolution",
      handler: () => handleImageEdit("super_resolution.super_resolution"),
    },
    {
      name: "Auto Color Correction",
      handler: () => handleImageEdit("automatic_color_correction.lowlight"),
    },
  ];

  const fileOperations = [
    {
      name: "Open Image",
      handler: async () => {
        const path = prompt("Enter image path:");
        if (!path) return;

        try {
          setIsLoading(true);
          setError(null);

          const response = await fetch(`${API_BASE_URL}/api/image/open_image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image_path: path }),
          });

          if (!response.ok) {
            throw new Error("Failed to open image");
          }

          const result = await response.blob();
          setProcessedImage(URL.createObjectURL(result));
        } catch (error) {
          setError(error.message);
        } finally {
          setIsLoading(false);
        }
      },
    },
    {
      name: "Save Image",
      handler: async () => {
        if (!processedImage) {
          setError("No image to save");
          return;
        }

        const path = prompt("Enter save path (e.g., output/image.png):");
        if (!path) return;

        const format = prompt("Enter format (PNG, JPG, JPEG):", "PNG");

        try {
          setIsLoading(true);
          setError(null);

          // Convert blob URL to file
          const response = await fetch(processedImage);
          const blob = await response.blob();

          const formData = new FormData();
          formData.append("image", blob, "image.png");
          formData.append("save_path", path);
          formData.append("format", format);

          const saveResponse = await fetch(
            `${API_BASE_URL}/api/image/save_image`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!saveResponse.ok) {
            throw new Error("Failed to save image");
          }

          const result = await saveResponse.json();
          alert(result.message);
        } catch (error) {
          setError(error.message);
        } finally {
          setIsLoading(false);
        }
      },
    },
    {
      name: "Export Image",
      handler: async () => {
        if (!processedImage) {
          setError("No image to export");
          return;
        }

        const format = prompt("Enter export format (PNG, JPG, JPEG):", "PNG");

        try {
          setIsLoading(true);
          setError(null);

          // Convert blob URL to file
          const response = await fetch(processedImage);
          const blob = await response.blob();

          const formData = new FormData();
          formData.append("image", blob, "image.png");
          formData.append("format", format);

          const exportResponse = await fetch(
            `${API_BASE_URL}/api/image/export_image`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!exportResponse.ok) {
            throw new Error("Failed to export image");
          }

          const result = await exportResponse.blob();
          const url = URL.createObjectURL(result);
          const a = document.createElement("a");
          a.href = url;
          a.download = `exported_image.${format.toLowerCase()}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          setError(error.message);
        } finally {
          setIsLoading(false);
        }
      },
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 3 }}>
              <input
                accept="image/*"
                type="file"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button variant="contained" component="span" fullWidth>
                  Upload Image
                </Button>
              </label>
            </Box>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Basic Tools</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {basicTools.map((category) => (
                  <Box key={category.category} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      {category.category}
                    </Typography>
                    <Grid container spacing={1}>
                      {category.operations.map((op) => (
                        <Grid item xs={6} key={op.name}>
                          <Button
                            variant="outlined"
                            onClick={op.handler}
                            disabled={!imageFile || isLoading}
                            fullWidth
                            size="small"
                          >
                            {op.name}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">AI Features</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  {aiFeatures.map((feature) => (
                    <Grid item xs={12} key={feature.name}>
                      <Button
                        variant="contained"
                        onClick={feature.handler}
                        disabled={!imageFile || isLoading}
                        fullWidth
                      >
                        {feature.name}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">File Operations</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  {fileOperations.map((operation) => (
                    <Grid item xs={12} key={operation.name}>
                      <Button
                        variant="outlined"
                        onClick={operation.handler}
                        disabled={isLoading}
                        fullWidth
                      >
                        {operation.name}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              height: "80vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {isLoading && (
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
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  zIndex: 1,
                }}
              >
                <CircularProgress />
              </Box>
            )}

            {processedImage ? (
              <Box
                component="img"
                src={processedImage}
                alt="Processed"
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="text.secondary">
                  Upload an image to start editing
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ImageEditor;
