import { Box, Button } from "@mui/material";
import React from "react";
import Breadcrumb from "../../components/Breadcrumb";
import AppTable from "../../components/AppTable";
import AppTableFilter from "../../components/AppTableFilter";

const Users = () => {
  return (
    <Box>
      <h1 style={{ margin: 0 }}>User Management</h1>
      <Breadcrumb
        homeLabel="Dashboard"
        items={[{ label: "Users", path: "/users" }]}
      />
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
            // onClick={() => setOpenDialog(true)}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              background: "#4CAF50",
            }}
          >
            Create User
          </Button>
        </Box>
      </Box>
      <AppTable
        // columns={columns}
        // data={paginatedData}
        rowKey="id"
        emptyText="No Users found"
      />
    </Box>
  );
};

export default Users;
