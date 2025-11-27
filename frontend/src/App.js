import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import ImageEditor from './components/ImageEditor';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ImageEditor />
    </ThemeProvider>
  );
}

export default App;