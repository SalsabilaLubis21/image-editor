import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Slider,
  CircularProgress,
} from "@mui/material";
import {
  CropRotate,
  Palette,
  Transform,
  AutoFixHigh,
  Waves, // Icon for Frequency Domain
  Brightness6, // Icon for Enhancement
} from "@mui/icons-material";
import BlurOnIcon from "@mui/icons-material/BlurOn";

const Toolbar = ({
  applyOperation,
  disabled,
  setMode,
  adjustments,
  setAdjustments,
  drawingColor,
  setDrawingColor,
  drawingText,
  setDrawingText,
  drawingSize,
  setDrawingSize,
  setDrawingTool,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const [loadingAi, setLoadingAi] = useState(false);
  const [errorAi, setErrorAi] = useState(null);

  const handleAiOperation = async (operation) => {
    setLoadingAi(true);
    setErrorAi(null);
    try {
      await applyOperation(operation);
    } catch (err) {
      setErrorAi("An error occurred during the AI operation.");
    } finally {
      setLoadingAi(false);
    }
  };

  const toolCategories = [
    {
      name: "Basic Tools",
      tools: [
        {
          name: "Geometric",
          icon: <CropRotate />,
          operations: [
            { name: "Rotate", operation: "geometric_transformations.rotate" },
            {
              name: "Flip H",
              operation: "geometric_transformations.flip_horizontal",
            },
            {
              name: "Flip V",
              operation: "geometric_transformations.flip_vertical",
            },
            { name: "Crop", isMode: true, mode: "crop" },
            {
              name: "Perspective Transform",
              operation: "geometric_transformations.perspective_transform",
            },
            {
              name: "Resize",
              operation: "geometric_transformations.handle_resize",
              params: { width: 800, height: 600 },
            },
          ],
        },
        {
          name: "Color",
          icon: <Palette />,
          operations: [
            {
              name: "Auto Contrast",
              operation: "color_adjustments.histogram_equalization",
            },
            {
              name: "Contrast Stretching",
              operation: "color_adjustments.contrast_stretching",
            },
          ],
        },
        {
          name: "Filters",
          icon: <BlurOnIcon />,
          operations: [
            {
              name: "Mean Filter",
              operation: "filtering_and_noise_removal.mean_filter",
            },
            {
              name: "Gaussian Blur",
              operation: "filtering_and_noise_removal.gaussian_blur",
            },
            {
              name: "Sharpen",
              operation: "filtering_and_noise_removal.sharpen",
            },
            {
              name: "Median Filter",
              operation: "filtering_and_noise_removal.median_filter",
            },
          ],
        },
        {
          name: "Morphological",
          icon: <Transform />,
          operations: [
            { name: "Erosion", operation: "morphological_operations.erosion" },
            {
              name: "Dilation",
              operation: "morphological_operations.dilation",
            },
            { name: "Opening", operation: "morphological_operations.opening" },
            { name: "Closing", operation: "morphological_operations.closing" },
          ],
        },
        {
          name: "Enhancement",
          icon: <Brightness6 />,
          operations: [
            {
              name: "Gamma Correction",
              operation: "image_enhancement.gamma_correction",
              params: { gamma: 1.2 },
            },
            {
              name: "Global Threshold",
              operation: "image_enhancement.global_threshold",
              params: { threshold: 127 },
            },
            {
              name: "Adaptive Threshold",
              operation: "image_enhancement.adaptive_threshold",
            },
            { name: "Smoothing", operation: "image_enhancement.smoothing" },
          ],
        },
      ],
    },
    {
      name: "Advanced Tools",
      tools: [
        {
          name: "AI Features",
          icon: <AutoFixHigh />,
          operations: [
            { name: "Remove Background", operation: "background_removal" },
            { name: "Super Resolution", operation: "super_resolution.realesrgan" },,
            { name: "Auto Color", operation: "auto_color" },
          ],
        },
        {
          name: "Frequency Domain",
          icon: <Waves />,
          operations: [
            {
              name: "Apply Fourier Transform",
              operation: "frequency_domain.fft",
            },
            {
              name: "Inverse Fourier Transform",
              operation: "frequency_domain.ifft",
            },
          ],
        },
        {
          name: "Drawing",
          icon: <Palette />,
          controls: (
            <Box sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1,
                  mb: 2,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDrawingTool("freehand")}
                >
                  Freehand
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDrawingTool("rectangle")}
                >
                  Rectangle
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDrawingTool("circle")}
                >
                  Circle
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDrawingTool("line")}
                >
                  Line
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDrawingTool("eraser")}
                >
                  Eraser
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDrawingTool("text")}
                >
                  Text
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDrawingTool("fill")}
                >
                  Fill
                </Button>
              </Box>
              <Typography variant="caption">Color</Typography>
              <input
                type="color"
                value={drawingColor}
                onChange={(e) => setDrawingColor(e.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  border: "none",
                  padding: 0,
                  background: "transparent",
                }}
              />
              <Typography variant="caption" sx={{ mt: 1 }}>
                Text
              </Typography>
              <input
                type="text"
                value={drawingText}
                onChange={(e) => setDrawingText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 4,
                  border: "1px solid #555",
                  background: "#333",
                  color: "white",
                }}
              />
              <Typography variant="caption" sx={{ mt: 1 }}>
                Brush Size: {drawingSize}
              </Typography>
              <Slider
                value={drawingSize}
                min={1}
                max={50}
                step={1}
                onChange={(e, value) => setDrawingSize(value)}
              />
            </Box>
          ),
        },
      ],
    },
  ];

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: 320,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 320,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
      <Box sx={{ overflow: "auto", p: 2, mt: 8 }}>
        {" "}
        {/* Add margin top to account for AppBar */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Adjustments
          </Typography>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption">
              Brightness: {adjustments.brightness}
            </Typography>
            <Slider
              value={adjustments.brightness}
              min={0}
              max={200}
              step={1}
              onChange={(e, value) =>
                setAdjustments({ ...adjustments, brightness: value })
              }
              disabled={disabled}
            />
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption">
              Contrast: {adjustments.contrast}
            </Typography>
            <Slider
              value={adjustments.contrast}
              min={0}
              max={200}
              step={1}
              onChange={(e, value) =>
                setAdjustments({ ...adjustments, contrast: value })
              }
              disabled={disabled}
            />
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption">
              Saturation: {adjustments.saturation}
            </Typography>
            <Slider
              value={adjustments.saturation}
              min={0}
              max={200}
              step={1}
              onChange={(e, value) =>
                setAdjustments({ ...adjustments, saturation: value })
              }
              disabled={disabled}
            />
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption">Hue: {adjustments.hue}</Typography>
            <Slider
              value={adjustments.hue}
              min={-180}
              max={180}
              step={1}
              onChange={(e, value) =>
                setAdjustments({ ...adjustments, hue: value })
              }
              disabled={disabled}
            />
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={() => applyOperation("adjustments", adjustments)}
            disabled={disabled}
          >
            Apply Adjustments
          </Button>
        </Box>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
          variant="fullWidth"
        >
          <Tab label="Basic" />
          <Tab label="Advanced" />
        </Tabs>
        {toolCategories.map((category, idx) => (
          <Box
            key={category.name}
            sx={{ display: activeTab === idx ? "block" : "none" }}
          >
            {category.tools.map((tool) => (
              <Box key={tool.name} sx={{ mb: 2 }}>
                <Typography
                  variant="overline"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "text.secondary",
                  }}
                >
                  {tool.icon}
                  {tool.name}
                </Typography>
                {tool.controls}
                {tool.operations && (
                  <List dense>
                    {tool.operations.map((op) => (
                      <ListItem key={op.name}>
                        {tool.name === "AI Features" ? (
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => handleAiOperation(op.operation)}
                            disabled={disabled || loadingAi}
                          >
                            {loadingAi ? (
                              <CircularProgress size={24} />
                            ) : (
                              op.name
                            )}
                          </Button>
                        ) : op.isMode ? (
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setMode(op.mode)}
                            disabled={disabled}
                          >
                            {op.name}
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => applyOperation(op.operation)}
                            disabled={disabled}
                          >
                            {op.name}
                          </Button>
                        )}
                      </ListItem>
                    ))}
                    {tool.name === "AI Features" && errorAi && (
                      <Typography color="error" sx={{ mt: 1, p: 1 }}>
                        {errorAi}
                      </Typography>
                    )}
                  </List>
                )}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Drawer>
  );
};

export default Toolbar;
