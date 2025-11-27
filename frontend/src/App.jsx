import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar as MuiToolbar,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import { Save, Undo, Redo, PhotoCamera } from "@mui/icons-material";
import "./App.css";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import LayerPanel from "./components/LayerPanel";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3ea6ff" },
    secondary: { main: "#00bcd4" },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e1e1e",
          borderBottom: "1px solid #333",
        },
      },
    },
  },
});

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [currentImageFile, setCurrentImageFile] = useState(null);

  useEffect(() => {
    const savedImage = localStorage.getItem("editedImage");
    if (savedImage) {
      setImage(savedImage);
    }
  }, []);

  const [layers, setLayers] = useState([]);
  const [activeLayerIndex, setActiveLayerIndex] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [maskMode, setMaskMode] = useState(false);
  const [mode, setMode] = useState("view");
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    scale: 100,
    rotate: 0,
    flipH: false,
    flipV: false,
  });
  const [drawingColor, setDrawingColor] = useState("#FFFFFF");
  const [drawingText, setDrawingText] = useState("Text");
  const [drawingSize, setDrawingSize] = useState(5);
  const canvasRef = useRef(null);

  const setDrawingTool = useCallback(
    (tool) => canvasRef.current?.setDrawingTool(tool),
    []
  );

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setCurrentImageFile(file);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/upload",
        formData,
        { responseType: "blob" }
      );

      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result;
        setImage(imageUrl);
        localStorage.setItem("editedImage", imageUrl);

        const newLayer = {
          id: Date.now(),
          name: "Background",
          image: imageUrl,
          visible: true,
          opacity: 100,
          drawing: null,
        };
        setLayers([newLayer]);
        setActiveLayerIndex(0);
        addToHistory([newLayer], 0);
      };
      reader.readAsDataURL(response.data);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error uploading image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyOperation = useCallback(
    async (operation, params = {}, maskBlob = null) => {
      if (!currentImageFile) {
        alert("Please upload an image first");
        return;
      }

      setLoading(true);
      if (operation === "super_resolution") {
        setLoadingMessage(
          "Processing super resolution... This may take a few minutes."
        );
      }

      const formData = new FormData();
      const imageToProcess = await fetch(layers[activeLayerIndex].image).then(
        (r) => r.blob()
      );

      formData.append("image", imageToProcess);
      formData.append("operation", operation);
      if (Object.keys(params).length > 0) {
        formData.append("params", JSON.stringify(params));
      }
      if (maskBlob) {
        formData.append("mask", maskBlob);
      }

      try {
        const response = await axios.post(
          "http://localhost:5000/api/edit",
          formData,
          {
            responseType: "blob",
            timeout:
              operation.includes("super_resolution") ||
              operation.includes("inpaint")
                ? 600000
                : 30000,
          }
        );

        const newImageUrl = URL.createObjectURL(response.data);
        const updatedLayers = [...layers];
        updatedLayers[activeLayerIndex] = {
          ...updatedLayers[activeLayerIndex],
          image: newImageUrl,
          drawing: null, // Flatten drawing after operation
        };
        setLayers(updatedLayers);
        setImage(newImageUrl);
        addToHistory(updatedLayers, activeLayerIndex);
      } catch (error) {
        console.error(`Error applying ${operation}:`, error);
        alert("An error occurred while processing the image.");
      } finally {
        setLoading(false);
        setLoadingMessage("");
      }
    },
    [currentImageFile, layers, activeLayerIndex]
  );

  const handleObjectRemoval = () => {
    if (!currentImageFile) return;
    setMaskMode(true);
    canvasRef.current?.setDrawingTool("brush");
  };

  const onMaskComplete = async (maskDataUrl) => {
    const maskBlob = await fetch(maskDataUrl).then((r) => r.blob());
    await applyOperation("object_removal.inpaint", {}, maskBlob);
    setMaskMode(false);
    canvasRef.current?.clearMask();
  };

  const handleCropComplete = (cropParams) => {
    applyOperation("geometric_transformations.crop", cropParams);
    setMode("view");
  };

  const addToHistory = (layersState, activeIndex) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      layers: JSON.parse(JSON.stringify(layersState)),
      activeLayerIndex: activeIndex,
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = async () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const historyState = history[newIndex];
    setLayers(historyState.layers);
    setActiveLayerIndex(historyState.activeLayerIndex);
    setHistoryIndex(newIndex);
    if (historyState.activeLayerIndex !== null) {
      setImage(historyState.layers[historyState.activeLayerIndex].image);
    }
  };

  const handleRedo = async () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const historyState = history[newIndex];
    setLayers(historyState.layers);
    setActiveLayerIndex(historyState.activeLayerIndex);
    setHistoryIndex(newIndex);
    if (historyState.activeLayerIndex !== null) {
      setImage(historyState.layers[historyState.activeLayerIndex].image);
    }
  };

  const handleLayerSelect = (index) => {
    setActiveLayerIndex(index);
    setImage(layers[index].image);
  };

  const handleDrawingComplete = (drawingData) => {
    if (activeLayerIndex === null) return;
    const updatedLayers = [...layers];
    updatedLayers[activeLayerIndex] = {
      ...updatedLayers[activeLayerIndex],
      drawing: drawingData,
    };
    setLayers(updatedLayers);
    addToHistory(updatedLayers, activeLayerIndex);
  };

  const handleSave = () => {
    const dataUrl = canvasRef.current?.getImageData();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "edited_image.png";
    a.click();
  };

  const createBlankCanvasDataUrl = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL();
  };

  const handleLayerAdd = () => {
    if (!image || layers.length === 0) {
      alert("Please upload a base image first.");
      return;
    }

    const newLayer = {
      id: Date.now(),
      name: `Layer ${layers.length + 1}`,
      image: layers[activeLayerIndex].image, // Use the current active layer's image
      visible: true,
      opacity: 100,
      drawing: null,
    };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerIndex(newLayers.length - 1);
    addToHistory(newLayers, newLayers.length - 1);
  };

  const handleLayerDelete = (index) => {
    if (layers.length <= 1) {
      alert("Cannot delete the last layer.");
      return;
    }
    const newLayers = layers.filter((_, i) => i !== index);
    let newActiveIndex = activeLayerIndex;
    if (index === activeLayerIndex) {
      newActiveIndex = Math.max(0, index - 1);
    } else if (index < activeLayerIndex) {
      newActiveIndex = activeLayerIndex - 1;
    }
    setLayers(newLayers);
    setActiveLayerIndex(newActiveIndex);
    setImage(newLayers[newActiveIndex].image);
    addToHistory(newLayers, newActiveIndex);
  };

  const handleLayerOpacityChange = (index, opacity) => {
    const updatedLayers = [...layers];
    updatedLayers[index].opacity = opacity;
    setLayers(updatedLayers);
    addToHistory(updatedLayers, activeLayerIndex);
  };

  const handleLayerVisibilityToggle = (index) => {
    const updatedLayers = [...layers];
    updatedLayers[index].visible = !updatedLayers[index].visible;
    setLayers(updatedLayers);
    addToHistory(updatedLayers, activeLayerIndex);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", height: "100vh", flexDirection: "column" }}>
        <AppBar
          position="static"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <MuiToolbar>
            <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
              <PhotoCamera sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Modern Image Editor
              </Typography>
            </Box>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              disabled={loading}
              id="image-upload"
              style={{ display: "none" }}
            />
            <label htmlFor="image-upload">
              <Button
                color="primary"
                variant="contained"
                component="span"
                disabled={loading}
              >
                Upload Image
              </Button>
            </label>
            <IconButton
              onClick={handleUndo}
              disabled={!image || loading || historyIndex <= 0}
              color="inherit"
            >
              <Undo />
            </IconButton>
            <IconButton
              onClick={handleRedo}
              disabled={!image || loading || historyIndex >= history.length - 1}
              color="inherit"
            >
              <Redo />
            </IconButton>
            <IconButton
              onClick={handleSave}
              disabled={!image || loading}
              color="inherit"
            >
              <Save />
            </IconButton>
          </MuiToolbar>
        </AppBar>
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Toolbar
            applyOperation={applyOperation}
            disabled={!image || loading}
            handleObjectRemoval={handleObjectRemoval}
            setMode={setMode}
            adjustments={adjustments}
            setAdjustments={setAdjustments}
            drawingColor={drawingColor}
            setDrawingColor={setDrawingColor}
            drawingText={drawingText}
            setDrawingText={setDrawingText}
            drawingSize={drawingSize}
            setDrawingSize={setDrawingSize}
            setDrawingTool={setDrawingTool}
          />
          <Box
            component="main"
            sx={{
              flex: 1,
              p: 3,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              bgcolor: "background.default",
            }}
          >
            <Canvas
              ref={canvasRef}
              image={image}
              drawing={layers[activeLayerIndex]?.drawing}
              loading={loading}
              loadingMessage={loadingMessage}
              onDrawingComplete={handleDrawingComplete}
              maskMode={maskMode}
              onMaskComplete={onMaskComplete}
              mode={mode}
              onCropComplete={handleCropComplete}
              adjustments={adjustments}
              drawingColor={drawingColor}
              drawingText={drawingText}
              drawingSize={drawingSize}
              layers={layers}
              activeLayerIndex={activeLayerIndex}
            />
          </Box>
          <LayerPanel
            layers={layers}
            activeLayerIndex={activeLayerIndex}
            onLayerSelect={handleLayerSelect}
            onLayerVisibilityToggle={handleLayerVisibilityToggle}
            onLayerOpacityChange={handleLayerOpacityChange}
            onLayerAdd={handleLayerAdd}
            onLayerDelete={handleLayerDelete}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
