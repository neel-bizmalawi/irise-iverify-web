import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import Breadcrumb from "../../components/Breadcrumb";
import AppPagination from "../../components/AppPagination";
import AppTable from "../../components/AppTable";
import AppTableFilter from "../../components/AppTableFilter";
import EditAuditDialog from "./EditAuditDialog";
import axios from "axios";
import { toast } from "react-toastify";
import ExportButtons from "../../components/ExportButtons";
import { API_BASE_URL } from "../../../config";

const BASE_IMAGE_URL = "http://192.168.0.106:3000";

const buildImageUrl = (src) => {
  if (!src || src === "-" || src === "null" || src === null) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${BASE_IMAGE_URL}${path}`;
};

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
const AuditProcess = () => {
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
      { key: "audit_id", label: "Audit ID", align: "center" },
      { key: "household_name", label: "Household Name" },
      { key: "national_id", label: "National ID", align: "center" },
      { key: "phone_number", label: "Phone Number", align: "center" },
      {
        key: "visit_date",
        label: "Visit Date",
        align: "center",
        render: fmtDate,
      },
      { key: "females_below_18", label: "Females <18", align: "center" },
      { key: "females_above_18", label: "Females >18", align: "center" },
      { key: "males_below_18", label: "Males <18", align: "center" },
      { key: "males_above_18", label: "Males >18", align: "center" },
      {
        key: "has_cookstove_observe",
        label: "Has Cookstove Observed",
        align: "center",
      },
      {
        key: "cooking_method_before",
        label: "Cooking Method Before",
        align: "center",
      },
      { key: "fuel_used_before", label: "Fuel Used Before", align: "center" },
      {
        key: "other_cooking_device_before",
        label: "Other Cooking Device Before",
        align: "center",
      },
      {
        key: "payment_requested",
        label: "Payment Requested",
        align: "center",
      },
      {
        key: "payment_requested_by",
        label: "Payment Requested By",
        align: "center",
      },
      {
        key: "training_before_receiving",
        label: "Training Before Receiving",
        align: "center",
      },
      { key: "rea_conset", label: "REA Consent", align: "center" },
      { key: "sign_consent", label: "Sign Consent", align: "center" },
      {
        key: "delivered_condition",
        label: "Delivered Condition",
        align: "center",
      },
      {
        key: "delivered_cook_stove",
        label: "Delivered Cook Stove",
        align: "center",
        render: fmtDate,
      },
      { key: "where_received", label: "Where Received", align: "center" },
      { key: "where_trained", label: "Where Trained", align: "center" },
      { key: "latitude", label: "Latitude", align: "center" },
      { key: "longitude", label: "Longitude", align: "center" },
      {
        key: "photo_path_cook_stove",
        label: "Cook Stove Photo",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="Cook Stove" />,
      },
      {
        key: "photo_path_cook_stove_area",
        label: "Cook Stove Area Photo",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="Cook Stove Area" />,
      },
      { key: "remarks", label: "Remarks", align: "center" },
      { key: "s_is_sync", label: "Sync Status", align: "center" },
      {
        key: "created_date",
        label: "Created Date",
        align: "center",
        render: fmtDate,
      },
      { key: "created_by", label: "Created By", align: "center" },
      {
        key: "modified_date",
        label: "Modified Date",
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
              onClick={() => handleEdit(row.audit_id)}
            >
              Edit
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
      { key: "household_name", label: "Household Name", type: "text" },
      { key: "national_id", label: "National ID", type: "text" },
      { key: "phone_number", label: "Phone Number", type: "text" },
      { key: "where_received", label: "Where Received", type: "text" },
      { key: "where_trained", label: "Where Trained", type: "text" },
      { key: "females_below_18", label: "Females Below 18", type: "number" },
      { key: "females_above_18", label: "Females Above 18", type: "number" },
      { key: "males_below_18", label: "Males Below 18", type: "number" },
      { key: "males_above_18", label: "Males Above 18", type: "number" },
      {
        key: "has_cookstove_observe",
        label: "Has Cookstove Observed",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "other_cooking_device_before",
        label: "Other Cooking Device Before",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "payment_requested",
        label: "Payment Requested",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "training_before_receiving",
        label: "Training Before Receiving",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "rea_conset",
        label: "REA Consent",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "sign_consent",
        label: "Sign Consent",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "delivered_condition",
        label: "Delivered Condition",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "s_is_sync",
        label: "Sync Status",
        type: "select",
        options: ["Y", "N"],
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
      { key: "visit_date", label: "Visit Date", type: "date" },
      { key: "created_date", label: "Created Date", type: "date" },
      { key: "modified_date", label: "Modified Date", type: "date" },
    ]);
  }, [userOptions]);

  useEffect(() => {
    fetchUsers();
  }, []);

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
          `${API_BASE_URL}/audit/list`,
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
          id: item.audit_id,
          audit_id: item.audit_id,
          household_name: item.household_name ?? "-",
          national_id: item.national_id ?? "-",
          phone_number: item.phone_number ?? "-",
          visit_date: item.visit_date ?? null,
          females_below_18: item.females_below_18 ?? "-",
          females_above_18: item.females_above_18 ?? "-",
          males_below_18: item.males_below_18 ?? "-",
          males_above_18: item.males_above_18 ?? "-",
          has_cookstove_observe: item.has_cookstove_observe ?? "-",
          cooking_method_before: item.cooking_method_before ?? "-",
          fuel_used_before: item.fuel_used_before ?? "-",
          other_cooking_device_before: item.other_cooking_device_before ?? "-",
          payment_requested: item.payment_requested ?? "-",
          payment_requested_by: item.payment_requested_by ?? "-",
          training_before_receiving: item.training_before_receiving ?? "-",
          rea_conset: item.rea_conset ?? "-",
          sign_consent: item.sign_consent ?? "-",
          delivered_condition: item.delivered_condition ?? "-",
          delivered_cook_stove: item.delivered_cook_stove ?? null,
          where_received: item.where_received ?? "-",
          where_trained: item.where_trained ?? "-",
          latitude: item.latitude ?? "-",
          longitude: item.longitude ?? "-",
          photo_path_cook_stove: item.photo_path_cook_stove || null,
          photo_path_cook_stove_area: item.photo_path_cook_stove_area || null,
          remarks: item.remarks ?? "-",
          s_is_sync: item.s_is_sync ?? "-",
          created_date: item.created_date ?? null,
          created_by: item.created_by ?? "-",
          modified_date: item.modified_date ?? null,
          modified_by: item.modified_by ?? "-",
        }));

        setTableData(mappedData);
        setTotalItems(response.totalRecords || 0);
        setTotalPages(response.totalPages || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load audit records");
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

  const handleSubmitAudit = async (formData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const fd = new FormData();

      fd.append("household_name", formData.household_name || "");
      fd.append("national_id", formData.national_id || "");
      fd.append("phone_number", formData.phone_number || "");
      fd.append("visit_date", formData.visit_date || "");
      fd.append("females_below_18", Number(formData.females_below_18) || 0);
      fd.append("females_above_18", Number(formData.females_above_18) || 0);
      fd.append("males_below_18", Number(formData.males_below_18) || 0);
      fd.append("males_above_18", Number(formData.males_above_18) || 0);
      fd.append("has_cookstove_observe", formData.has_cookstove_observe);
      fd.append("cooking_method_before", formData.cooking_method_before || "");
      fd.append("fuel_used_before", formData.fuel_used_before || "");
      fd.append(
        "other_cooking_device_before",
        formData.other_cooking_device_before,
      );
      fd.append("payment_requested", formData.payment_requested);
      fd.append(
        "payment_requested_by",
        formData.payment_requested_by || "",
      );
      fd.append(
        "training_before_receiving",
        formData.training_before_receiving,
      );
      fd.append("rea_conset", formData.rea_conset);
      fd.append("sign_consent", formData.sign_consent);
      fd.append("delivered_condition", formData.delivered_condition);
      fd.append("delivered_cook_stove", formData.delivered_cook_stove || "");
      fd.append("where_received", formData.where_received || "");
      fd.append("where_trained", formData.where_trained || "");
      if (formData.latitude) fd.append("latitude", formData.latitude);
      if (formData.longitude) fd.append("longitude", formData.longitude);
      fd.append("remarks", formData.remarks || "");
      fd.append("s_is_sync", formData.s_is_sync || "Y");

      if (formData.photo_path_cook_stove instanceof File) {
        fd.append("photo_path_cook_stove", formData.photo_path_cook_stove);
      } else if (formData.photo_path_cook_stove === "REMOVED") {
        fd.append("photo_path_cook_stove", "");
      }

      if (formData.photo_path_cook_stove_area instanceof File) {
        fd.append(
          "photo_path_cook_stove_area",
          formData.photo_path_cook_stove_area,
        );
      } else if (formData.photo_path_cook_stove_area === "REMOVED") {
        fd.append("photo_path_cook_stove_area", "");
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(
        `${API_BASE_URL}/audit/update/${editId}`,
        fd,
        config,
      );
      toast.success("Audit record updated successfully!");

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
      const res = await axios.get(`${API_BASE_URL}/audit/get/${id}`);
      const item = res.data?.data;
      if (!item) {
        toast.error("Audit record not found");
        return;
      }

      setEditData({
        household_name: item.household_name ?? "",
        national_id: item.national_id ?? "",
        phone_number: item.phone_number ?? "",
        visit_date: item.visit_date
          ? item.visit_date.substring(0, 10)
          : "",
        females_below_18: item.females_below_18 ?? "",
        females_above_18: item.females_above_18 ?? "",
        males_below_18: item.males_below_18 ?? "",
        males_above_18: item.males_above_18 ?? "",
        has_cookstove_observe: item.has_cookstove_observe ?? "no",
        cooking_method_before: item.cooking_method_before ?? "",
        fuel_used_before: item.fuel_used_before ?? "",
        other_cooking_device_before:
          item.other_cooking_device_before ?? "no",
        payment_requested: item.payment_requested ?? "no",
        payment_requested_by: item.payment_requested_by ?? "",
        training_before_receiving: item.training_before_receiving ?? "no",
        rea_conset: item.rea_conset ?? "no",
        sign_consent: item.sign_consent ?? "no",
        delivered_condition: item.delivered_condition ?? "no",
        delivered_cook_stove: item.delivered_cook_stove
          ? item.delivered_cook_stove.substring(0, 10)
          : "",
        where_received: item.where_received ?? "",
        where_trained: item.where_trained ?? "",
        latitude: item.latitude ?? "",
        longitude: item.longitude ?? "",
        remarks: item.remarks ?? "",
        s_is_sync: item.s_is_sync ?? "Y",
        photo_path_cook_stove: item.photo_path_cook_stove || null,
        photo_path_cook_stove_area: item.photo_path_cook_stove_area || null,
      });

      setEditId(id);
      setOpenDialog(true);
    } catch (error) {
      console.error("Get by ID error:", error);
      toast.error("Failed to fetch audit record");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <h1 style={{ margin: 0 }}>Audit Process</h1>
      <Breadcrumb
        homeLabel="Dashboard"
        items={[{ label: "Audit Process", path: "/audit-process" }]}
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
            fileName="AuditProcess"
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
          emptyText="No audit records found"
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

      <EditAuditDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditId(null);
          setEditData(null);
        }}
        onSubmit={handleSubmitAudit}
        initialData={editData}
      />
    </Box>
  );
};

export default AuditProcess;


// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { Box, Button, CircularProgress, Typography } from "@mui/material";
// import Breadcrumb from "../../components/Breadcrumb";
// import AppPagination from "../../components/AppPagination";
// import AppTable from "../../components/AppTable";
// import AppTableFilter from "../../components/AppTableFilter";
// import EditAuditDialog from "./EditAuditDialog";
// import axios from "axios";
// import { toast } from "react-toastify";
// import ExportButtons from "../../components/ExportButtons";
// import { API_BASE_URL } from "../../../config";

// const BASE_IMAGE_URL = "http://192.168.0.106:3000";

// const buildImageUrl = (src) => {
//   if (!src || src === "-" || src === "null" || src === null) return null;
//   if (src.startsWith("http://") || src.startsWith("https://")) return src;
//   const path = src.startsWith("/") ? src : `/${src}`;
//   return `${BASE_IMAGE_URL}${path}`;
// };

// const ImagePreviewModal = ({ open, src, alt, onClose }) => {
//   if (!open || !src) return null;
//   return (
//     <Box
//       onClick={onClose}
//       sx={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 9999,
//         background: "rgba(0,0,0,0.78)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         cursor: "zoom-out",
//         backdropFilter: "blur(3px)",
//       }}
//     >
//       <Box
//         onClick={(e) => e.stopPropagation()}
//         sx={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}
//       >
//         <Box
//           onClick={onClose}
//           sx={{
//             position: "absolute",
//             top: -14,
//             right: -14,
//             width: 30,
//             height: 30,
//             borderRadius: "50%",
//             background: "#fff",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             cursor: "pointer",
//             fontWeight: 700,
//             color: "#374151",
//             fontSize: "0.85rem",
//             boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
//             zIndex: 1,
//             "&:hover": { background: "#f3f4f6" },
//           }}
//         >
//           ✕
//         </Box>
//         <img
//           src={src}
//           alt={alt || "preview"}
//           style={{
//             maxWidth: "90vw",
//             maxHeight: "85vh",
//             objectFit: "contain",
//             borderRadius: 8,
//             boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
//             display: "block",
//           }}
//         />
//         <Typography
//           sx={{
//             textAlign: "center",
//             color: "rgba(255,255,255,0.65)",
//             fontSize: "0.72rem",
//             mt: 1,
//           }}
//         >
//           {alt} — {src.split("/").pop()}
//         </Typography>
//       </Box>
//     </Box>
//   );
// };

// const ImageThumb = ({ src, alt }) => {
//   const [broken, setBroken] = React.useState(false);
//   const [preview, setPreview] = React.useState(false);
//   const fullSrc = buildImageUrl(src);

//   if (!fullSrc || broken) {
//     return (
//       <Box
//         sx={{
//           width: 48,
//           height: 48,
//           borderRadius: "6px",
//           border: "1.5px dashed #e5e7eb",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           margin: "0 auto",
//           background: "#f9fafb",
//         }}
//       >
//         <span style={{ color: "#d1d5db", fontSize: "0.75rem" }}>—</span>
//       </Box>
//     );
//   }

//   return (
//     <>
//       <Box sx={{ display: "flex", justifyContent: "center" }}>
//         <img
//           src={fullSrc}
//           alt={alt || "image"}
//           title={`${alt} — ${src.split("/").pop()}`}
//           style={{
//             width: 48,
//             height: 48,
//             objectFit: "cover",
//             borderRadius: 6,
//             border: "1.5px solid #e5e7eb",
//             cursor: "zoom-in",
//             display: "block",
//             background: "#f3f4f6",
//             transition: "transform 0.15s ease, box-shadow 0.15s ease",
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.transform = "scale(1.12)";
//             e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.22)";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.transform = "scale(1)";
//             e.currentTarget.style.boxShadow = "none";
//           }}
//           onClick={() => setPreview(true)}
//           onError={() => setBroken(true)}
//         />
//       </Box>
//       <ImagePreviewModal
//         open={preview}
//         src={fullSrc}
//         alt={alt}
//         onClose={() => setPreview(false)}
//       />
//     </>
//   );
// };

// const fmtDate = (value) =>
//   value
//     ? new Date(value).toLocaleString("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     : "-";

// // ── Main Component ────────────────────────────────────────────────────────────
// const AuditProcess = () => {
//   const [tableData, setTableData] = useState([]);
//   const [filterFields, setFilterFields] = useState([]);
//   const [activeFilters, setActiveFilters] = useState([]);

//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);
//   const [totalItems, setTotalItems] = useState(0);
//   const [totalPages, setTotalPages] = useState(0);

//   const [loading, setLoading] = useState(false);
//   const [openDialog, setOpenDialog] = useState(false);

//   const [editId, setEditId] = useState(null);
//   const [editData, setEditData] = useState(null);

//   const [userOptions, setUserOptions] = useState([]);

//   // ── Columns ───────────────────────────────────────────────────────────────
//   const columns = useMemo(
//     () => [
//       { key: "audit_id", label: "Audit ID", align: "center" },
//       { key: "household_name", label: "Household Name" },
//       { key: "national_id", label: "National ID", align: "center" },
//       { key: "phone_number", label: "Phone Number", align: "center" },
//       {
//         key: "visit_date",
//         label: "Visit Date",
//         align: "center",
//         render: fmtDate,
//       },
//       { key: "females_below_18", label: "Females <18", align: "center" },
//       { key: "females_above_18", label: "Females >18", align: "center" },
//       { key: "males_below_18", label: "Males <18", align: "center" },
//       { key: "males_above_18", label: "Males >18", align: "center" },
//       {
//         key: "has_cookstove_observe",
//         label: "Has Cookstove Observed",
//         align: "center",
//       },
//       {
//         key: "cooking_method_before",
//         label: "Cooking Method Before",
//         align: "center",
//       },
//       { key: "fuel_used_before", label: "Fuel Used Before", align: "center" },
//       {
//         key: "other_cooking_device_before",
//         label: "Other Cooking Device Before",
//         align: "center",
//       },
//       {
//         key: "payment_requested",
//         label: "Payment Requested",
//         align: "center",
//       },
//       {
//         key: "payment_requested_by",
//         label: "Payment Requested By",
//         align: "center",
//       },
//       {
//         key: "training_before_receiving",
//         label: "Training Before Receiving",
//         align: "center",
//       },
//       { key: "rea_conset", label: "REA Consent", align: "center" },
//       { key: "sign_consent", label: "Sign Consent", align: "center" },
//       {
//         key: "delivered_condition",
//         label: "Delivered Condition",
//         align: "center",
//       },
//       {
//         key: "delivered_cook_stove",
//         label: "Delivered Cook Stove",
//         align: "center",
//         render: fmtDate,
//       },
//       { key: "where_received", label: "Where Received", align: "center" },
//       { key: "where_trained", label: "Where Trained", align: "center" },
//       { key: "latitude", label: "Latitude", align: "center" },
//       { key: "longitude", label: "Longitude", align: "center" },
//       {
//         key: "photo_path_cook_stove",
//         label: "Cook Stove Photo",
//         align: "center",
//         render: (value) => <ImageThumb src={value} alt="Cook Stove" />,
//       },
//       {
//         key: "photo_path_cook_stove_area",
//         label: "Cook Stove Area Photo",
//         align: "center",
//         render: (value) => <ImageThumb src={value} alt="Cook Stove Area" />,
//       },
//       { key: "remarks", label: "Remarks", align: "center" },
//       { key: "s_is_sync", label: "Sync Status", align: "center" },
//       {
//         key: "created_date",
//         label: "Created Date",
//         align: "center",
//         render: fmtDate,
//       },
//       { key: "created_by", label: "Created By", align: "center" },
//       {
//         key: "modified_date",
//         label: "Modified Date",
//         align: "center",
//         render: fmtDate,
//       },
//       { key: "modified_by", label: "Modified By", align: "center" },
//       {
//         key: "actions",
//         label: "Actions",
//         align: "center",
//         render: (_, row) => (
//           <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
//             <Button
//               size="small"
//               variant="outlined"
//               onClick={() => handleEdit(row.audit_id)}
//             >
//               Edit
//             </Button>
//             <Button
//               size="small"
//               variant="outlined"
//               color="error"
//               onClick={() => handleDelete(row.audit_id)}
//             >
//               Delete
//             </Button>
//           </Box>
//         ),
//       },
//     ],
//     [],
//   );

//   // ── Filter Fields ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     setFilterFields([
//       { key: "household_name", label: "Household Name", type: "text" },
//       { key: "national_id", label: "National ID", type: "text" },
//       { key: "phone_number", label: "Phone Number", type: "text" },
//       { key: "where_received", label: "Where Received", type: "text" },
//       { key: "where_trained", label: "Where Trained", type: "text" },
//       { key: "females_below_18", label: "Females Below 18", type: "number" },
//       { key: "females_above_18", label: "Females Above 18", type: "number" },
//       { key: "males_below_18", label: "Males Below 18", type: "number" },
//       { key: "males_above_18", label: "Males Above 18", type: "number" },
//       {
//         key: "has_cookstove_observe",
//         label: "Has Cookstove Observed",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "other_cooking_device_before",
//         label: "Other Cooking Device Before",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "payment_requested",
//         label: "Payment Requested",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "training_before_receiving",
//         label: "Training Before Receiving",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "rea_conset",
//         label: "REA Consent",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "sign_consent",
//         label: "Sign Consent",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "delivered_condition",
//         label: "Delivered Condition",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "s_is_sync",
//         label: "Sync Status",
//         type: "select",
//         options: ["Y", "N"],
//       },
//       {
//         key: "created_by",
//         label: "Created By",
//         type: "searchable",
//         options: userOptions,
//         labelKey: "name",
//         onSearch: fetchUsers,
//       },
//       {
//         key: "modified_by",
//         label: "Modified By",
//         type: "searchable",
//         options: userOptions,
//         labelKey: "name",
//         onSearch: fetchUsers,
//       },
//       { key: "visit_date", label: "Visit Date", type: "date" },
//       { key: "created_date", label: "Created Date", type: "date" },
//       { key: "modified_date", label: "Modified Date", type: "date" },
//     ]);
//   }, [userOptions]);

//   useEffect(() => {
//     fetchUsers();
//   }, []);

//   const fetchUsers = async () => {
//     try {
//       const res = await axios.get(`${API_BASE_URL}/user/getAllUsers`);
//       setUserOptions(res.data?.data || []);
//     } catch (error) {
//       console.error("fetchUsers error:", error);
//     }
//   };

//   // ── Fetch table data ──────────────────────────────────────────────────────
//   const fetchData = useCallback(
//     async (pageNum, limitNum, filters = []) => {
//       try {
//         setLoading(true);

//         const cleanFilters =
//           Array.isArray(filters) && filters.length > 0
//             ? filters.map(({ field, operator, value }) => ({
//                 field,
//                 operator,
//                 value,
//               }))
//             : [];

//         const res = await axios.post(
//           `${API_BASE_URL}/audit/list`,
//           { filters: cleanFilters },
//           { params: { page: pageNum, limit: limitNum } },
//         );

//         const response = res.data;

//         if (!response.data || !Array.isArray(response.data)) {
//           setTableData([]);
//           setTotalItems(0);
//           setTotalPages(0);
//           return;
//         }

//         const mappedData = response.data.map((item) => ({
//           id: item.audit_id,
//           audit_id: item.audit_id,
//           household_name: item.household_name ?? "-",
//           national_id: item.national_id ?? "-",
//           phone_number: item.phone_number ?? "-",
//           visit_date: item.visit_date ?? null,
//           females_below_18: item.females_below_18 ?? "-",
//           females_above_18: item.females_above_18 ?? "-",
//           males_below_18: item.males_below_18 ?? "-",
//           males_above_18: item.males_above_18 ?? "-",
//           has_cookstove_observe: item.has_cookstove_observe ?? "-",
//           cooking_method_before: item.cooking_method_before ?? "-",
//           fuel_used_before: item.fuel_used_before ?? "-",
//           other_cooking_device_before: item.other_cooking_device_before ?? "-",
//           payment_requested: item.payment_requested ?? "-",
//           payment_requested_by: item.payment_requested_by ?? "-",
//           training_before_receiving: item.training_before_receiving ?? "-",
//           rea_conset: item.rea_conset ?? "-",
//           sign_consent: item.sign_consent ?? "-",
//           delivered_condition: item.delivered_condition ?? "-",
//           delivered_cook_stove: item.delivered_cook_stove ?? null,
//           where_received: item.where_received ?? "-",
//           where_trained: item.where_trained ?? "-",
//           latitude: item.latitude ?? "-",
//           longitude: item.longitude ?? "-",
//           photo_path_cook_stove: item.photo_path_cook_stove || null,
//           photo_path_cook_stove_area: item.photo_path_cook_stove_area || null,
//           remarks: item.remarks ?? "-",
//           s_is_sync: item.s_is_sync ?? "-",
//           created_date: item.created_date ?? null,
//           created_by: item.created_by ?? "-",
//           modified_date: item.modified_date ?? null,
//           modified_by: item.modified_by ?? "-",
//         }));

//         setTableData(mappedData);
//         setTotalItems(response.totalRecords || 0);
//         setTotalPages(response.totalPages || 0);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//         toast.error("Failed to load audit records");
//       } finally {
//         setLoading(false);
//       }
//     },
//     [columns],
//   );

//   useEffect(() => {
//     fetchData(page, pageSize, activeFilters);
//   }, [page, pageSize, activeFilters, fetchData]);

//   // ── Handlers ──────────────────────────────────────────────────────────────
//   const handleApplyFilters = (filters) => {
//     setActiveFilters(filters);
//     setPage(1);
//   };

//   const handleClearFilters = () => {
//     setActiveFilters([]);
//     setPage(1);
//   };

//   const handleSubmitAudit = async (formData) => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");

//       const fd = new FormData();

//       fd.append("household_name", formData.household_name || "");
//       fd.append("national_id", formData.national_id || "");
//       fd.append("phone_number", formData.phone_number || "");
//       fd.append("visit_date", formData.visit_date || "");
//       fd.append("females_below_18", Number(formData.females_below_18) || 0);
//       fd.append("females_above_18", Number(formData.females_above_18) || 0);
//       fd.append("males_below_18", Number(formData.males_below_18) || 0);
//       fd.append("males_above_18", Number(formData.males_above_18) || 0);
//       fd.append("has_cookstove_observe", formData.has_cookstove_observe);
//       fd.append("cooking_method_before", formData.cooking_method_before || "");
//       fd.append("fuel_used_before", formData.fuel_used_before || "");
//       fd.append(
//         "other_cooking_device_before",
//         formData.other_cooking_device_before,
//       );
//       fd.append("payment_requested", formData.payment_requested);
//       fd.append(
//         "payment_requested_by",
//         formData.payment_requested_by || "",
//       );
//       fd.append(
//         "training_before_receiving",
//         formData.training_before_receiving,
//       );
//       fd.append("rea_conset", formData.rea_conset);
//       fd.append("sign_consent", formData.sign_consent);
//       fd.append("delivered_condition", formData.delivered_condition);
//       fd.append("delivered_cook_stove", formData.delivered_cook_stove || "");
//       fd.append("where_received", formData.where_received || "");
//       fd.append("where_trained", formData.where_trained || "");
//       if (formData.latitude) fd.append("latitude", formData.latitude);
//       if (formData.longitude) fd.append("longitude", formData.longitude);
//       fd.append("remarks", formData.remarks || "");
//       fd.append("s_is_sync", formData.s_is_sync || "Y");

//       if (formData.photo_path_cook_stove instanceof File) {
//         fd.append("photo_path_cook_stove", formData.photo_path_cook_stove);
//       } else if (formData.photo_path_cook_stove === "REMOVED") {
//         fd.append("photo_path_cook_stove", "");
//       }

//       if (formData.photo_path_cook_stove_area instanceof File) {
//         fd.append(
//           "photo_path_cook_stove_area",
//           formData.photo_path_cook_stove_area,
//         );
//       } else if (formData.photo_path_cook_stove_area === "REMOVED") {
//         fd.append("photo_path_cook_stove_area", "");
//       }

//       const config = { headers: { Authorization: `Bearer ${token}` } };

//       await axios.put(
//         `${API_BASE_URL}/audit/update/${editId}`,
//         fd,
//         config,
//       );
//       toast.success("Audit record updated successfully!");

//       setPage(1);
//       await fetchData(1, pageSize, activeFilters);
//       setOpenDialog(false);
//       setEditId(null);
//       setEditData(null);
//     } catch (error) {
//       console.error("Submit error:", error);
//       const raw = error?.response?.data?.message || "";
//       toast.error(raw || "Operation failed. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleEdit = async (id) => {
//     try {
//       setLoading(true);
//       const res = await axios.get(`${API_BASE_URL}/audit/get/${id}`);
//       const item = res.data?.data;
//       if (!item) {
//         toast.error("Audit record not found");
//         return;
//       }

//       setEditData({
//         household_name: item.household_name ?? "",
//         national_id: item.national_id ?? "",
//         phone_number: item.phone_number ?? "",
//         visit_date: item.visit_date
//           ? item.visit_date.substring(0, 10)
//           : "",
//         females_below_18: item.females_below_18 ?? "",
//         females_above_18: item.females_above_18 ?? "",
//         males_below_18: item.males_below_18 ?? "",
//         males_above_18: item.males_above_18 ?? "",
//         has_cookstove_observe: item.has_cookstove_observe ?? "no",
//         cooking_method_before: item.cooking_method_before ?? "",
//         fuel_used_before: item.fuel_used_before ?? "",
//         other_cooking_device_before:
//           item.other_cooking_device_before ?? "no",
//         payment_requested: item.payment_requested ?? "no",
//         payment_requested_by: item.payment_requested_by ?? "",
//         training_before_receiving: item.training_before_receiving ?? "no",
//         rea_conset: item.rea_conset ?? "no",
//         sign_consent: item.sign_consent ?? "no",
//         delivered_condition: item.delivered_condition ?? "no",
//         delivered_cook_stove: item.delivered_cook_stove
//           ? item.delivered_cook_stove.substring(0, 10)
//           : "",
//         where_received: item.where_received ?? "",
//         where_trained: item.where_trained ?? "",
//         latitude: item.latitude ?? "",
//         longitude: item.longitude ?? "",
//         remarks: item.remarks ?? "",
//         s_is_sync: item.s_is_sync ?? "Y",
//         photo_path_cook_stove: item.photo_path_cook_stove || null,
//         photo_path_cook_stove_area: item.photo_path_cook_stove_area || null,
//       });

//       setEditId(id);
//       setOpenDialog(true);
//     } catch (error) {
//       console.error("Get by ID error:", error);
//       toast.error("Failed to fetch audit record");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     try {
//       await axios.delete(`${API_BASE_URL}/audit/delete/${id}`);
//       toast.success("Audit record deleted successfully!");
//       await fetchData(page, pageSize, activeFilters);
//     } catch (error) {
//       toast.error("Failed to delete audit record");
//     }
//   };

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <Box>
//       <h1 style={{ margin: 0 }}>Audit Process</h1>
//       <Breadcrumb
//         homeLabel="Dashboard"
//         items={[{ label: "Audit Process", path: "/audit-process" }]}
//       />

//       <Box
//         sx={{
//           mb: 2,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           flexWrap: "wrap",
//           gap: 2,
//         }}
//       >
//         <AppTableFilter
//           fields={filterFields}
//           value={activeFilters}
//           onChange={handleApplyFilters}
//           onApply={handleApplyFilters}
//           onClear={handleClearFilters}
//         />
//         <Box sx={{ display: "flex", gap: 2 }}>
//           <ExportButtons
//             columns={columns}
//             data={tableData}
//             fileName="AuditProcess"
//           />
//         </Box>
//       </Box>

//       {loading ? (
//         <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
//           <CircularProgress />
//         </Box>
//       ) : (
//         <AppTable
//           columns={columns}
//           data={tableData}
//           rowKey="id"
//           emptyText="No audit records found"
//         />
//       )}

//       <AppPagination
//         page={page}
//         totalPages={totalPages}
//         totalItems={totalItems}
//         pageSize={pageSize}
//         onPageChange={(newPage) => setPage(newPage)}
//         onPageSizeChange={(newSize) => {
//           setPageSize(newSize);
//           setPage(1);
//         }}
//       />

//       <EditAuditDialog
//         open={openDialog}
//         onClose={() => {
//           setOpenDialog(false);
//           setEditId(null);
//           setEditData(null);
//         }}
//         onSubmit={handleSubmitAudit}
//         initialData={editData}
//       />
//     </Box>
//   );
// };

// export default AuditProcess;