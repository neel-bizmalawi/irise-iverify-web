import React, { useState, useMemo } from "react";
import { Box, Button } from "@mui/material";
import { Plus } from "lucide-react";
import Breadcrumb from "../../components/Breadcrumb";
import AppTable from "../../components/AppTable";
import AppPagination from "../../components/AppPagination";
import CreateBeneficiaryDialog from "./CreateBeneficiaryDialog";
import AppTableFilter from "../../components/AppTableFilter";

const DUMMY_DATA = [
  {
    id: 1,
    name: "Ravi Kumar",
    village: "Pune",
    phone: "9876543210",
    status: "Active",
  },
  {
    id: 2,
    name: "Anita Sharma",
    village: "Mumbai",
    phone: "9876543211",
    status: "Inactive",
  },
];

const columns = [
  { key: "name", label: "Beneficiary Name" },
  { key: "village", label: "Village" },
  { key: "phone", label: "Phone", align: "center" },
  { key: "status", label: "Status", align: "center" },
];

const Beneficiary = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);

  const totalItems = DUMMY_DATA.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return DUMMY_DATA.slice(start, start + pageSize);
  }, [page, pageSize]);

  return (
    <Box>
      <h1 style={{ margin: 0 }}>Beneficiary</h1>
      <Breadcrumb
        homeLabel="Dashboard"
        items={[{ label: "Beneficiary", path: "/beneficiary" }]}
      />

      {/* Top Section */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <AppTableFilter
        // fields={filterFields}
        // value={activeFilters}
        // onApply={handleApplyFilters}
        // onClear={handleClearFilters}
        />
        <Box sx={{ display: "flex", gap: 2 }}>
          {" "}
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
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            onClick={() => setOpenDialog(true)}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              background: "#4CAF50",
            }}
          >
            Create Beneficiary
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <AppTable
        columns={columns}
        data={paginatedData}
        rowKey="id"
        emptyText="No beneficiaries found"
      />

      {/* Pagination */}
      <AppPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Dialog */}
      <CreateBeneficiaryDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={(data) => console.log("Beneficiary Data:", data)}
      />
    </Box>
  );
};

export default Beneficiary;
