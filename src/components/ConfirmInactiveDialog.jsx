import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const ConfirmInactiveDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Deactivation",
  message,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <WarningAmberRoundedIcon sx={{ color: "#f59e0b", fontSize: 28 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {message ||
            "Are you sure you want to mark this record as Inactive?"}
        </Typography>
        <Box
          sx={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: "8px",
            px: 2,
            py: 1.2,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "#92400e", fontWeight: 500 }}
          >
            ⚠️ Once deleted, this record <strong>cannot be reactivated</strong>. This action is permanent.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            fontWeight: 600,
            borderColor: "#d1d5db",
            color: "#374151",
            "&:hover": { borderColor: "#9ca3af", background: "#f9fafb" },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            fontWeight: 600,
            background: "#ef4444",
            boxShadow: "none",
            "&:hover": { background: "#dc2626", boxShadow: "none" },
          }}
        >
          Yes, delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmInactiveDialog;