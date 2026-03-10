import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import Breadcrumb from "../../components/Breadcrumb";
import AppPagination from "../../components/AppPagination";
import AppTable from "../../components/AppTable";
import AppTableFilter from "../../components/AppTableFilter";
import EditMonitoringDialog from "./EditMonitoringDialog";
import axios from "axios";
import { toast } from "react-toastify";
import ExportButtons from "../../components/ExportButtons";
import { API_BASE_URL } from "../../../config";

const BASE_IMAGE_URL = "http://192.168.0.106:3000";

// ── Build absolute URL from a relative path ───────────────────────────────────
const buildImageUrl = (src) => {
  if (!src || src === "-" || src === "null" || src === null) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${BASE_IMAGE_URL}${path}`;
};

// ── Full-screen image preview modal ──────────────────────────────────────────
const ImagePreviewModal = ({ open, src, alt, onClose }) => {
  if (!open || !src) return null;
  return (
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
        backdropFilter: "blur(3px)",
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}
      >
        <Box
          onClick={onClose}
          sx={{
            position: "absolute",
            top: -14,
            right: -14,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontWeight: 700,
            color: "#374151",
            fontSize: "0.85rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            zIndex: 1,
            "&:hover": { background: "#f3f4f6" },
          }}
        >
          ✕
        </Box>
        <img
          src={src}
          alt={alt || "preview"}
          style={{
            maxWidth: "90vw",
            maxHeight: "85vh",
            objectFit: "contain",
            borderRadius: 8,
            boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
            display: "block",
          }}
        />
        <Typography
          sx={{
            textAlign: "center",
            color: "rgba(255,255,255,0.65)",
            fontSize: "0.72rem",
            mt: 1,
          }}
        >
          {alt} — {src.split("/").pop()}
        </Typography>
      </Box>
    </Box>
  );
};

// ── Thumbnail cell component ──────────────────────────────────────────────────
const ImageThumb = ({ src, alt }) => {
  const [broken, setBroken] = React.useState(false);
  const [preview, setPreview] = React.useState(false);

  const fullSrc = buildImageUrl(src);

  if (!fullSrc || broken) {
    return (
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "6px",
          border: "1.5px dashed #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
          background: "#f9fafb",
        }}
      >
        <span style={{ color: "#d1d5db", fontSize: "0.75rem" }}>—</span>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <img
          src={fullSrc}
          alt={alt || "image"}
          title={`${alt} — ${src.split("/").pop()}`}
          style={{
            width: 48,
            height: 48,
            objectFit: "cover",
            borderRadius: 6,
            border: "1.5px solid #e5e7eb",
            cursor: "zoom-in",
            display: "block",
            background: "#f3f4f6",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.12)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.22)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onClick={() => setPreview(true)}
          onError={() => setBroken(true)}
        />
      </Box>
      <ImagePreviewModal
        open={preview}
        src={fullSrc}
        alt={alt}
        onClose={() => setPreview(false)}
      />
    </>
  );
};

// ── Date formatter ────────────────────────────────────────────────────────────
const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

// ── Main Component ────────────────────────────────────────────────────────────
const Monitoring = () => {
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

  const [userOptions, setUserOptions] = useState([]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      { key: "id", label: "ID", align: "center" },
      { key: "user_id", label: "User ID", align: "center" },
      { key: "national_id", label: "National ID", align: "center" },
      { key: "agent_name", label: "Agent Name" },
      {
        key: "visit_at",
        label: "Visit At",
        align: "center",
        render: fmtDate,
      },
      { key: "old_gps_lat", label: "Old GPS Lat", align: "center" },
      { key: "old_gps_lng", label: "Old GPS Lng", align: "center" },
      { key: "new_gps_lat", label: "New GPS Lat", align: "center" },
      { key: "new_gps_lng", label: "New GPS Lng", align: "center" },
      { key: "device_serial_no", label: "Device Serial No", align: "center" },
      {
        key: "new_device_serial_no",
        label: "New Device Serial No",
        align: "center",
      },
      { key: "hh_name_same", label: "HH Name Same", align: "center" },
      { key: "stoves_present", label: "Stoves Present", align: "center" },
      { key: "stove_being_used", label: "Stove Being Used", align: "center" },
      { key: "times_used_today", label: "Times Used Today", align: "center" },
      { key: "stove_condition", label: "Stove Condition", align: "center" },
      {
        key: "photo_url",
        label: "Photo URL",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="Photo" />,
      },
      { key: "nfc_tag_status", label: "NFC Tag Status", align: "center" },
      {
        key: "user_satisfaction",
        label: "User Satisfaction",
        align: "center",
      },
      { key: "fuel_type", label: "Fuel Type", align: "center" },
      { key: "daily_fuel_cost", label: "Daily Fuel Cost", align: "center" },
      {
        key: "savings_3_months",
        label: "Savings (3 Months)",
        align: "center",
      },
      {
        key: "est_fuel_last3meals_kg",
        label: "Est. Fuel Last 3 Meals (kg)",
        align: "center",
      },
      { key: "needs_training", label: "Needs Training", align: "center" },
      { key: "training_type", label: "Training Type", align: "center" },
      {
        key: "training_performed",
        label: "Training Performed",
        align: "center",
      },
      {
        key: "training_not_done_reason",
        label: "Training Not Done Reason",
        align: "center",
      },
      { key: "needs_more_visits", label: "Needs More Visits", align: "center" },
      {
        key: "more_visits_reason",
        label: "More Visits Reason",
        align: "center",
      },
      {
        key: "health_hospital_less",
        label: "Health: Hospital Less",
        align: "center",
      },
      {
        key: "health_better_air",
        label: "Health: Better Air",
        align: "center",
      },
      {
        key: "photo_path",
        label: "Photo",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="Monitoring Photo" />,
      },
      {
        key: "created_date",
        label: "Created Date",
        align: "center",
        render: fmtDate,
      },
      { key: "created_by", label: "Created By", align: "center" },
      {
        key: "modified_at",
        label: "Modified At",
        align: "center",
        render: fmtDate,
      },
      { key: "modified_by", label: "Modified By", align: "center" },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        render: (_, row) => (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleEdit(row.id)}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleDelete(row.id)}
            >
              Delete
            </Button>
          </Box>
        ),
      },
    ],
    [],
  );

  // ── Filter Fields ─────────────────────────────────────────────────────────
  useEffect(() => {
    setFilterFields([
      { key: "national_id", label: "National ID", type: "text" },
      { key: "agent_name", label: "Agent Name", type: "text" },
      { key: "device_serial_no", label: "Device Serial No", type: "text" },
      {
        key: "new_device_serial_no",
        label: "New Device Serial No",
        type: "text",
      },
      {
        key: "hh_name_same",
        label: "HH Name Same",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "stoves_present",
        label: "Stoves Present",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "stove_being_used",
        label: "Stove Being Used",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "stove_condition",
        label: "Stove Condition",
        type: "select",
        options: ["Good", "Fair", "Poor"],
      },
      {
        key: "user_satisfaction",
        label: "User Satisfaction",
        type: "select",
        options: ["Happy", "Neutral", "Unhappy"],
      },
      {
        key: "fuel_type",
        label: "Fuel Type",
        type: "select",
        options: [
          "Indigenous Wood",
          "Charcoal",
          "Pellets",
          "LPG",
          "Other",
        ],
      },
      {
        key: "needs_training",
        label: "Needs Training",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "needs_more_visits",
        label: "Needs More Visits",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "health_hospital_less",
        label: "Health: Hospital Less",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "health_better_air",
        label: "Health: Better Air",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "created_by",
        label: "Created By",
        type: "searchable",
        options: userOptions,
        labelKey: "name",
        onSearch: fetchUsers,
      },
      {
        key: "modified_by",
        label: "Modified By",
        type: "searchable",
        options: userOptions,
        labelKey: "name",
        onSearch: fetchUsers,
      },
      { key: "visit_at", label: "Visit At", type: "date" },
      { key: "created_date", label: "Created Date", type: "date" },
      { key: "modified_at", label: "Modified At", type: "date" },
    ]);
  }, [userOptions]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── API helpers ───────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/user/getAllUsers`);
      setUserOptions(res.data?.data || []);
    } catch (error) {
      console.error("fetchUsers error:", error);
    }
  };

  // ── Fetch table data ──────────────────────────────────────────────────────
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
          `${API_BASE_URL}/monitoring/list`,
          { filters: cleanFilters },
          { params: { page: pageNum, limit: limitNum } },
        );

        const response = res.data;

        if (!response.data || !Array.isArray(response.data)) {
          setTableData([]);
          setTotalItems(0);
          setTotalPages(0);
          return;
        }

        const mappedData = response.data.map((item) => ({
          id: item.id,
          user_id: item.user_id ?? "-",
          national_id: item.national_id ?? "-",
          agent_name: item.agent_name ?? "-",
          visit_at: item.visit_at ?? null,
          old_gps_lat: item.old_gps_lat ?? "-",
          old_gps_lng: item.old_gps_lng ?? "-",
          new_gps_lat: item.new_gps_lat ?? "-",
          new_gps_lng: item.new_gps_lng ?? "-",
          device_serial_no: item.device_serial_no ?? "-",
          new_device_serial_no: item.new_device_serial_no ?? "-",
          hh_name_same: item.hh_name_same ?? "-",
          stoves_present: item.stoves_present ?? "-",
          stove_being_used: item.stove_being_used ?? "-",
          times_used_today: item.times_used_today ?? "-",
          stove_condition: item.stove_condition ?? "-",
          photo_url: item.photo_url || null,
          nfc_tag_status: item.nfc_tag_status ?? "-",
          user_satisfaction: item.user_satisfaction ?? "-",
          fuel_type: item.fuel_type ?? "-",
          daily_fuel_cost: item.daily_fuel_cost ?? "-",
          savings_3_months: item.savings_3_months ?? "-",
          est_fuel_last3meals_kg: item.est_fuel_last3meals_kg ?? "-",
          needs_training: item.needs_training ?? "-",
          training_type: item.training_type ?? "-",
          training_performed: item.training_performed ?? "-",
          training_not_done_reason: item.training_not_done_reason ?? "-",
          needs_more_visits: item.needs_more_visits ?? "-",
          more_visits_reason: item.more_visits_reason ?? "-",
          health_hospital_less: item.health_hospital_less ?? "-",
          health_better_air: item.health_better_air ?? "-",
          photo_path: item.photo_path || null,
          created_date: item.created_date ?? null,
          created_by: item.created_by ?? "-",
          modified_at: item.modified_at ?? null,
          modified_by: item.modified_by ?? "-",
        }));

        setTableData(mappedData);
        setTotalItems(response.totalRecords || 0);
        setTotalPages(response.totalPages || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load monitoring records");
      } finally {
        setLoading(false);
      }
    },
    [columns],
  );

  useEffect(() => {
    fetchData(page, pageSize, activeFilters);
  }, [page, pageSize, activeFilters, fetchData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setPage(1);
  };

  const handleSubmitMonitoring = async (formData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const fd = new FormData();

      fd.append("national_id", formData.national_id);
      fd.append("agent_name", formData.agent_name || "");
      fd.append("device_serial_no", formData.device_serial_no || "");
      fd.append("new_device_serial_no", formData.new_device_serial_no || "");
      fd.append("hh_name_same", formData.hh_name_same);
      fd.append("stoves_present", formData.stoves_present);
      fd.append("stove_being_used", formData.stove_being_used);
      fd.append("times_used_today", formData.times_used_today || "");
      fd.append("stove_condition", formData.stove_condition || "");
      fd.append("nfc_tag_status", formData.nfc_tag_status || "");
      fd.append("user_satisfaction", formData.user_satisfaction || "");
      fd.append("fuel_type", formData.fuel_type || "");
      fd.append("daily_fuel_cost", formData.daily_fuel_cost || "");
      fd.append("savings_3_months", formData.savings_3_months || "");
      fd.append(
        "est_fuel_last3meals_kg",
        formData.est_fuel_last3meals_kg || "",
      );
      fd.append("needs_training", formData.needs_training);
      fd.append("training_type", formData.training_type || "");
      fd.append("training_performed", formData.training_performed || "");
      fd.append(
        "training_not_done_reason",
        formData.training_not_done_reason || "",
      );
      fd.append("needs_more_visits", formData.needs_more_visits);
      fd.append("more_visits_reason", formData.more_visits_reason || "");
      fd.append("health_hospital_less", formData.health_hospital_less);
      fd.append("health_better_air", formData.health_better_air);
      if (formData.old_gps_lat) fd.append("old_gps_lat", formData.old_gps_lat);
      if (formData.old_gps_lng) fd.append("old_gps_lng", formData.old_gps_lng);
      if (formData.new_gps_lat) fd.append("new_gps_lat", formData.new_gps_lat);
      if (formData.new_gps_lng) fd.append("new_gps_lng", formData.new_gps_lng);

      if (formData.photo_path instanceof File) {
        fd.append("photo_path", formData.photo_path);
      } else if (formData.photo_path === "REMOVED") {
        fd.append("photo_path", "");
      }

      if (formData.photo_url instanceof File) {
        fd.append("photo_url", formData.photo_url);
      } else if (formData.photo_url === "REMOVED") {
        fd.append("photo_url", "");
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editId) {
        await axios.put(
          `${API_BASE_URL}/monitoring/update/${editId}`,
          fd,
          config,
        );
        toast.success("Monitoring record updated successfully!");
      }

      setPage(1);
      await fetchData(1, pageSize, activeFilters);
      setOpenDialog(false);
      setEditId(null);
      setEditData(null);
    } catch (error) {
      console.error("Submit error:", error);
      const raw = error?.response?.data?.message || "";
      toast.error(raw || "Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/monitoring/get/${id}`);
      const item = res.data?.data;
      if (!item) {
        toast.error("Monitoring record not found");
        return;
      }

      setEditData({
        national_id: item.national_id ?? "",
        agent_name: item.agent_name ?? "",
        device_serial_no: item.device_serial_no ?? "",
        new_device_serial_no: item.new_device_serial_no ?? "",
        hh_name_same: item.hh_name_same ?? "no",
        stoves_present: item.stoves_present ?? "no",
        stove_being_used: item.stove_being_used ?? "no",
        times_used_today: item.times_used_today ?? "",
        stove_condition: item.stove_condition ?? "",
        nfc_tag_status: item.nfc_tag_status ?? "",
        user_satisfaction: item.user_satisfaction ?? "",
        fuel_type: item.fuel_type ?? "",
        daily_fuel_cost: item.daily_fuel_cost ?? "",
        savings_3_months: item.savings_3_months ?? "",
        est_fuel_last3meals_kg: item.est_fuel_last3meals_kg ?? "",
        needs_training: item.needs_training ?? "no",
        training_type: item.training_type ?? "",
        training_performed: item.training_performed ?? "",
        training_not_done_reason: item.training_not_done_reason ?? "",
        needs_more_visits: item.needs_more_visits ?? "no",
        more_visits_reason: item.more_visits_reason ?? "",
        health_hospital_less: item.health_hospital_less ?? "no",
        health_better_air: item.health_better_air ?? "no",
        old_gps_lat: item.old_gps_lat ?? "",
        old_gps_lng: item.old_gps_lng ?? "",
        new_gps_lat: item.new_gps_lat ?? "",
        new_gps_lng: item.new_gps_lng ?? "",
        photo_path: item.photo_path || null,
        photo_url: item.photo_url || null,
      });

      setEditId(id);
      setOpenDialog(true);
    } catch (error) {
      console.error("Get by ID error:", error);
      toast.error("Failed to fetch monitoring record");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/monitoring/delete/${id}`);
      toast.success("Monitoring record deleted successfully!");
      await fetchData(page, pageSize, activeFilters);
    } catch (error) {
      toast.error("Failed to delete monitoring record");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <h1 style={{ margin: 0 }}>Monitoring</h1>
      <Breadcrumb
        homeLabel="Dashboard"
        items={[{ label: "Monitoring", path: "/monitoring" }]}
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
            fileName="Monitoring"
          />
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
          emptyText="No monitoring records found"
        />
      )}

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

      <EditMonitoringDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditId(null);
          setEditData(null);
        }}
        onSubmit={handleSubmitMonitoring}
        initialData={editData}
      />
    </Box>
  );
};

export default Monitoring;