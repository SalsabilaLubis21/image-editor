import React from "react";
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Slider,
  Button,
  Divider,
} from "@mui/material";
import { Visibility, VisibilityOff, Delete, Add } from "@mui/icons-material";

const LayerPanel = ({
  layers,
  activeLayerIndex,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerOpacityChange,
  onLayerAdd,
  onLayerDelete,
}) => {
  const drawerWidth = 280;

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderLeft: 1,
          borderColor: "divider",
          marginTop: "64px", // Adjust to account for AppBar height
        },
      }}
    >
      <Box
        sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2 }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Layers
        </Typography>

        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={onLayerAdd}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          Add Layer
        </Button>

        <Divider sx={{ mb: 2 }} />

        <List sx={{ flex: 1, overflow: "auto" }}>
          {layers.map((layer, index) => (
            <ListItem
              key={layer.id}
              selected={index === activeLayerIndex}
              onClick={() => onLayerSelect(index)}
              sx={{
                mb: 1,
                borderRadius: 1,
                flexDirection: "column",
                alignItems: "stretch",
                border: 1,
                borderColor:
                  index === activeLayerIndex ? "primary.main" : "divider",
                cursor: "pointer",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerVisibilityToggle(index);
                  }}
                >
                  {layer.visible ? (
                    <Visibility fontSize="small" />
                  ) : (
                    <VisibilityOff fontSize="small" />
                  )}
                </IconButton>
                <ListItemText
                  primary={layer.name}
                  primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  sx={{ ml: 1, flex: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDelete(index);
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  width: "100%",
                }}
              >
                <Typography variant="caption" sx={{ mr: 1 }}>
                  Opacity
                </Typography>
                <Slider
                  size="small"
                  value={layer.opacity}
                  min={0}
                  max={100}
                  onChange={(e, value) => onLayerOpacityChange(index, value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </Box>
            </ListItem>
          ))}

          {layers.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", mt: 2 }}
            >
              No layers yet.
            </Typography>
          )}
        </List>
      </Box>
    </Drawer>
  );
};

export default LayerPanel;
