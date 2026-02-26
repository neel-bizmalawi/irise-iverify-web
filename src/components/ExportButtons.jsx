import React from "react";
import { Button } from "@mui/material";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const ExportButtons = ({ columns, data, fileName }) => {
  return (
    <>
      <Button
        variant="contained"
        color="primary"
        sx={{
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "10px",
          px: 3,
          boxShadow: "none",
        }}
        onClick={() => exportToPDF(columns, data, fileName)}
      >
        Export PDF
      </Button>

      <Button
        variant="contained"
        color="primary"
        sx={{
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "10px",
          px: 3,
          boxShadow: "none",
        }}
        onClick={() => exportToExcel(columns, data, fileName)}
      >
        Export Excel
      </Button>
    </>
  );
};

export default ExportButtons;
