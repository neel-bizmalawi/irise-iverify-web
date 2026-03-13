import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import Breadcrumb from "../../components/Breadcrumb";
import AppPagination from "../../components/AppPagination";
import AppTable from "../../components/AppTable";
import AppTableFilter from "../../components/AppTableFilter";
import CreateTrainingSiteDialog from "./CreateTrainingSiteDialog";
import axios from "axios";
import { toast } from "react-toastify";
import ExportButtons from "../../components/ExportButtons";
import { API_BASE_URL } from "../../../config";

const TrainingSites = () => {
  const [tableData, setTableData] = useState([]);
  const [filterFields, setFilterFields] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(null);

  const [districtOptions, setDistrictOptions] = useState([]);
  const [authorityOptions, setAuthorityOptions] = useState([]);
  const [createOptions, setCreateOptions] = useState([]);
  const [modifiedByOptions, setModifiedByOptions] = useState([]);

  const [districtLoading, setDistrictLoading] = useState(false);
  const [authorityLoading, setAuthorityLoading] = useState(false);

  // Memoize columns to prevent recreation on each render
  const columns = useMemo(
    () => [
      { key: "training_point_id", label: "Training Point ID", align: "center" },
      { key: "training_site", label: "Training Site" },
      { key: "district", label: "District" },
      { key: "traditional_authority", label: "Traditional Authority" },
      { key: "gvh_name", label: "Group Village Head" },
      { key: "village_head_name", label: "Village Head Name" },
      { key: "road_access", label: "Road Access", align: "center" },
      { key: "total_people", label: "Total People", align: "center" },
      { key: "house_holds_count", label: "Households", align: "center" },
      { key: "cookstoves_count", label: "Cookstoves", align: "center" },
      {
        key: "house_hold_radius",
        label: "Household Radius (km)",
        align: "center",
        render: (value) => (value ? `${value} km` : "-"),
      },
      { key: "latitude", label: "Latitude", align: "center" },
      { key: "longitude", label: "Longitude", align: "center" },
      { key: "created_by", label: "Created By", align: "center" },
      { key: "modified_by", label: "Modified By", align: "center" },
      {
        key: "created_date",
        label: "Created Date",
        align: "center",
        render: (value) =>
          value
            ? new Date(value).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
      },
      {
        key: "modified_date",
        label: "Modified Date",
        align: "center",
        render: (value) =>
          value
            ? new Date(value).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        render: (_, row) => (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleEdit(row.training_point_id)}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleDelete(row.training_point_id)}
            >
              Delete
            </Button>
          </Box>
        ),
      },
    ],
    [], // Empty deps – columns never change
  );

  useEffect(() => {
    setFilterFields([
      { key: "training_site", label: "Training Site", type: "text" },
      {
        key: "district",
        label: "District",
        type: "searchable",
        options: districtOptions,
        labelKey: "district_name",
        onSearch: searchDistrict,
      },
      {
        key: "traditional_authority",
        label: "Traditional Authority",
        type: "searchable",
        options: authorityOptions,
        labelKey: "authority_name",
        onSearch: searchAuthority,
      },
      { key: "gvh_name", label: "Group Village Head", type: "text" },
      { key: "village_head_name", label: "Village Head Name", type: "text" },
      {
        key: "road_access",
        label: "Road Access",
        type: "select",
        options: ["Yes", "No"],
      },
      { key: "training_point_id", label: "Training Point ID", type: "number" },
      { key: "total_people", label: "Total People", type: "number" },
      { key: "house_holds_count", label: "Households", type: "number" },
      { key: "cookstoves_count", label: "Cookstoves", type: "number" },
      {
        key: "house_hold_radius",
        label: "Household Radius (km)",
        type: "number",
      },

      // { key: "created_by", label: "Created By", type: "text" },
      {
        key: "created_by",
        label: "Created By",
        type: "searchable",
        options: createOptions,
        labelKey: "name",
        onSearch: fetchusers,
      },
      // { key: "modified_by", label: "Modified By", type: "text" },
      {
        key: "modified_by",
        label: "Modified By",
        type: "searchable",
        options: modifiedByOptions,
        labelKey: "name",
        onSearch: fetchusers,
      },
      { key: "created_date", label: "Created Date", type: "date" },
      { key: "modified_date", label: "Modified Date", type: "date" },
    ]);
  }, [districtOptions, authorityOptions, createOptions, modifiedByOptions]);

  useEffect(() => {
    fetchDistricts();
    fetchAuthorities();
    fetchusers();
  }, []);

  const searchDistrict = async (query) => {
    try {
      setDistrictLoading(true);

      const res = await axios.get(
        `${API_BASE_URL}/training-site/search-district`,
        { params: { search: query } },
      );

      setDistrictOptions(res.data?.data || []);
    } catch (error) {
      console.error("District search error:", error);
    } finally {
      setDistrictLoading(false);
    }
  };

  const fetchusers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/user/getAllUsers`);

      setCreateOptions(res.data?.data || []);
      setModifiedByOptions(res.data?.data || []);
    } catch (error) {
      console.error("fetchuser error:", error);
    }
  };

  const searchAuthority = async (query) => {
    try {
      setAuthorityLoading(true);

      const res = await axios.get(
        `${API_BASE_URL}/training-site/search-authority`,
        { params: { search: query } },
      );

      setAuthorityOptions(res.data?.data || []);
    } catch (error) {
      console.error("District search error:", error);
    } finally {
      setAuthorityLoading(false);
    }
  };

  const fetchDistricts = async (search = "") => {
    try {
      setDistrictLoading(true);

      const res = await axios.get(
        `${API_BASE_URL}/training-site/district_slug`,
        {
          params: { search },
        },
      );

      setDistrictOptions(res.data?.data || []);
    } catch (error) {
      console.error("District fetch error:", error);
    } finally {
      setDistrictLoading(false);
    }
  };

  const fetchAuthorities = async (search = "") => {
    try {
      setAuthorityLoading(true);

      const res = await axios.get(
        `${API_BASE_URL}/training-site/authority_slug`,
        {
          params: { search },
        },
      );

      setAuthorityOptions(res.data?.data || []);
    } catch (error) {
      console.error("Authority fetch error:", error);
    } finally {
      setAuthorityLoading(false);
    }
  };

  // Fetch data with pagination and filters
  const fetchData = useCallback(
    async (pageNum, limitNum, filters = []) => {
      try {
        setLoading(true);

        const cleanFilters =
          Array.isArray(filters) && filters.length > 0
            ? filters.map(({ field, operator, value }) => ({
                field,
                operator,
                value,
              }))
            : [];

        const res = await axios.post(
          `${API_BASE_URL}/training-site/list`,
          { filters: cleanFilters },
          {
            params: {
              page: pageNum,
              limit: limitNum,
            },
          },
        );

        const response = res.data;

        if (!response.data || !Array.isArray(response.data)) {
          setTableData([]);
          setTotalItems(0);
          setTotalPages(0);

          [];
          return;
        }

        const mappedData = response.data.map((item) => ({
          id: item.training_point_id,
          training_point_id: item.training_point_id,
          training_site: item.training_site,
          district: item.district,
          traditional_authority: item.traditional_authority,
          gvh_name: item.gvh_name,
          village_head_name: item.village_head_name,
          road_access: item.road_access,
          total_people: item.total_people,
          house_holds_count: item.house_holds_count,
          cookstoves_count: item.cookstoves_count,
          house_hold_radius: item.house_hold_radius ?? null,
          training_status: item.training_status,
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status,
          created_by: item.created_by,
          modified_by: item.modified_by,
          created_date: item.created_date ?? null,
          modified_date: item.modified_date ?? null,
        }));

        setTableData(mappedData);
        setTotalItems(response.totalRecords || 0);
        setTotalPages(response.totalPages || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load training sites");
      } finally {
        setLoading(false);
      }
    },
    [columns],
  );
  // Fetch when page, pageSize, or activeFilters change
  useEffect(() => {
    fetchData(page, pageSize, activeFilters);
  }, [page, pageSize, activeFilters, fetchData]);

  // Handlers for filter changes
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setPage(1);
  };

  // Create / Update submission
  const handleSubmitTrainingSite = async (formData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        training_site: formData.trainingSiteName,
        district: formData.district,
        gvh_name: formData.groupVillageHead,
        village_head_name: formData.villageHeadName,
        traditional_authority: formData.traditionalAuthority,
        cookstoves_count: Number(formData.totalCookstoves),
        house_holds_count: Number(formData.totalHouseHolds),
        house_hold_radius: Number(formData.houseHoldRadius),
        total_people: Number(formData.totalPeople),
        road_access: formData.roadAccess,
      };

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      if (editId) {
        await axios.put(
          `${API_BASE_URL}/training-site/Update_Trainig/${editId}`,
          payload,
          config,
        );
        toast.success("Training site updated successfully!");
      } else {
        await axios.post(
          `${API_BASE_URL}/training-site/create_training`,
          payload,
          config,
        );
        toast.success("Training site created successfully!");
      }

      // After mutation, refresh the list (reset to page 1, keep current filters)
      setPage(1);
      await fetchData(1, pageSize, activeFilters);

      setOpenDialog(false);
      setEditId(null);
      setEditData(null);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Edit: fetch single record and open dialog
  const handleEdit = async (id) => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API_BASE_URL}/training-site/Get_training/${id}`,
      );
      const items = res.data?.data;
      if (!items || items.length === 0) {
        toast.error("Training site not found");
        return;
      }
      const item = items[0];

      setEditData({
        trainingSiteName: item.training_site ?? "",
        district: item.district ?? "",
        groupVillageHead: item.gvh_name ?? "",
        villageHeadName: item.village_head_name ?? "",
        traditionalAuthority: item.traditional_authority ?? "",
        totalCookstoves: item.cookstoves_count ?? "",
        totalHouseHolds: item.house_holds_count ?? "",
        houseHoldRadius: item.house_hold_radius ?? "",
        totalPeople: item.total_people ?? "",
        roadAccess: item.road_access?.toLowerCase() === "yes" ? "Yes" : "No",
      });

      setEditId(id);
      setOpenDialog(true);
    } catch (error) {
      console.error("Get by ID error:", error);
      toast.error("Failed to fetch training site");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/training-site/Delete_training/${id}`);
      toast.success("Training site deleted successfully!");
      // Refresh the list (stay on current page, keep filters)
      await fetchData(page, pageSize, activeFilters);
    } catch (error) {
      toast.error("Failed to delete training site");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const fetchAllForExport = async () => {
    const cleanFilters =
      Array.isArray(activeFilters) && activeFilters.length > 0
        ? activeFilters.map(({ field, operator, value }) => ({
            field,
            operator,
            value,
          }))
        : [];
    const res = await axios.post(
      `${API_BASE_URL}/training-site/list`,
      { filters: cleanFilters },
      { params: { page: 1, limit: 100000 } },
    );
    return res.data?.data ?? [];
  };

  return (
    <Box>
      <h1 style={{ margin: 0 }}>Training Sites</h1>
      <Breadcrumb
        homeLabel="Dashboard"
        items={[{ label: "Training Sites", path: "/training" }]}
      />

      {/* Top Row */}
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
          fields={filterFields}
          value={activeFilters}
          onChange={handleApplyFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
        <Box sx={{ display: "flex", gap: 2 }}>
          <ExportButtons
            columns={columns}
            data={tableData}
            fileName="Training_Sites"
            onExportAll={fetchAllForExport}
          />
          <Button
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "10px",
              px: 3,
              boxShadow: "none",
              background: "#4CAF50",
            }}
            onClick={() => setOpenDialog(true)}
          >
            Create
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <AppTable
          columns={columns}
          data={tableData}
          rowKey="id"
          emptyText="No training sites found"
        />
      )}

      {/* Pagination */}
      <AppPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* Dialog */}
      <CreateTrainingSiteDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditId(null);
          setEditData(null);
        }}
        onSubmit={handleSubmitTrainingSite}
        initialData={editData}
      />
    </Box>
  );
};

export default TrainingSites;
