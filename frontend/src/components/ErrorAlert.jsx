import { Alert, Snackbar } from "@mui/material";

const ErrorAlert = ({ error, onClose }) => {
  const open = Boolean(error.message);

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert onClose={onClose} severity="error" sx={{ width: "100%" }}>
        <div>
          <strong>{error.message}</strong>
          {error.details && (
            <div style={{ marginTop: "8px", fontSize: "0.9em" }}>
              {error.details}
            </div>
          )}
        </div>
      </Alert>
    </Snackbar>
  );
};

export default ErrorAlert;
