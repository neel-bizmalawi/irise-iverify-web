import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
// import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { exportToExcel } from "../utils/exportUtils";

const ExportButtons = ({ columns, data, fileName, onExportAll }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const allData = onExportAll ? await onExportAll() : data;
      exportToExcel(columns, allData, fileName);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* <Button
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
      </Button> */}

      <Button
        variant="contained"
        color="primary"
        disabled={exporting}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "10px",
          px: 3,
          boxShadow: "none",
          minWidth: 130,
        }}
        onClick={handleExport}
      >
        {exporting ? (
          <>
            <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
            Exporting…
          </>
        ) : (
          "Export Excel"
        )}
      </Button>
    </>
  );
};

export default ExportButtons;


// import React from "react";
// import { Button } from "@mui/material";
// // import { exportToExcel, exportToPDF } from "../utils/exportUtils";
// import { exportToExcel,  } from "../utils/exportUtils";
// const ExportButtons = ({ columns, data, fileName }) => {
//   return (
//     <>
//       {/* <Button
//         variant="contained"
//         color="primary"
//         sx={{
//           textTransform: "none",
//           fontWeight: 600,
//           borderRadius: "10px",
//           px: 3,
//           boxShadow: "none",
//         }}
//         onClick={() => exportToPDF(columns, data, fileName)}
//       >
//         Export PDF
//       </Button> */}

//       <Button
//         variant="contained"
//         color="primary"
//         sx={{
//           textTransform: "none",
//           fontWeight: 600,
//           borderRadius: "10px",
//           px: 3,
//           boxShadow: "none",
//         }}
//         onClick={() => exportToExcel(columns, data, fileName)}
//       >
//         Export Excel
//       </Button>
//     </>
//   );
// };

// export default ExportButtons;
