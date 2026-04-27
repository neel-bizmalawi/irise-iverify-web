import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import Breadcrumb from "../../components/Breadcrumb";
import AppPagination from "../../components/AppPagination";
import AppTable from "../../components/AppTable";
import AppTableFilter from "../../components/AppTableFilter";
import CreateBeneficiaryDialog from "./CreateBeneficiaryDialog";
import ConfirmInactiveDialog from "../../components/ConfirmInactiveDialog";
import axios from "axios";
import { toast } from "react-toastify";
import ExportButtons from "../../components/ExportButtons";
import { API_BASE_URL } from "../../config";

const BASE_IMAGE_URL = API_BASE_URL;

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

// ── Date formatter helper ─────────────────────────────────────────────────────
const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

// ── Main Component ────────────────────────────────────────────────────────────
const Beneficiary = () => {
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

  const pendingFilesRef = React.useRef({});

  // ── Confirm inactive dialog state ─────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [trainingSiteOptions, setTrainingSiteOptions] = useState([]);
  const [cookingMethodOptions, setCookingMethodOptions] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [createOptions, setCreateOptions] = useState([]);
  const [modifiedByOptions, setModifiedByOptions] = useState([]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      { key: "beneficiary_id", label: "Beneficiary ID", align: "center" },
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "training_site", label: "Training Site" },
      { key: "mobile_no", label: "Contact No", align: "center" },
      { key: "national_id", label: "National ID", align: "center" },
      { key: "cooking_method", label: "Cooking Method" },
      { key: "language", label: "Language", align: "center" },
      { key: "other_cookstove", label: "Other Cookstove", align: "center" },
      { key: "females_below_18", label: "Females <18", align: "center" },
      { key: "females_above_18", label: "Females >18", align: "center" },
      { key: "males_below_18", label: "Males <18", align: "center" },
      { key: "males_above_18", label: "Males >18", align: "center" },
      {
        key: "national_id_attachment",
        label: "National Id Attachment",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="National ID" />,
      },
      {
        key: "house_pic",
        label: "House Pic",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="House" />,
      },
      {
        key: "cookstove_pic",
        label: "Cookstove Pic",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="Cookstove" />,
      },
      {
        key: "signature",
        label: "Signature",
        align: "center",
        render: (value) => <ImageThumb src={value} alt="Signature" />,
      },
      {
        key: "national_id_timestamp",
        label: "National ID Timestamp",
        align: "center",
        render: fmtDate,
      },
      {
        key: "house_pic_timestamp",
        label: "House Pic Timestamp",
        align: "center",
        render: fmtDate,
      },
      {
        key: "cookstove_pic_timestamp",
        label: "Cookstove Pic Timestamp",
        align: "center",
        render: fmtDate,
      },
      {
        key: "signature_timestamp",
        label: "Signature Timestamp",
        align: "center",
        render: fmtDate,
      },
      {
        key: "read_doc",
        label: "Would you like to read this?",
        align: "center",
      },
      {
        key: "understood_doc",
        label: "Has the person understood the document?",
        align: "center",
      },
      {
        key: "read_to_you",
        label: "Would you like the document read to you?",
        align: "center",
      },
      {
        key: "stove_status_delivery",
        label: "Stove Good Condition",
        align: "center",
      },
      {
        key: "no_other_cook_stove_present",
        label: "No Other Stove",
        align: "center",
      },
      {
        key: "primary_residence_confirmation",
        label: "Primary Residence",
        align: "center",
      },
      { key: "device_serial_no", label: "Device Serial No", align: "center" },
      { key: "latitude", label: "Latitude", align: "center" },
      { key: "longitude", label: "Longitude", align: "center" },
      { key: "created_by_name", label: "Created By", align: "center" },
      { key: "modified_by_name", label: "Modified By", align: "center" },
      {
        key: "created_date",
        label: "Created Date",
        align: "center",
        render: (value) =>
          value
            ? new Date(value).toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
              })
            : "-",
      },
      {
        key: "modified_date",
        label: "Modified Date",
        align: "center",
        render: fmtDate,
      },
      // {
      //   key: "status",
      //   label: "Status",
      //   align: "center",
      //   render: (value) => {
      //     const status = value?.toLowerCase().trim();
      //     return (
      //       <span
      //         style={{
      //           color: status === "active" ? "green" : "red",
      //           fontWeight: 600,
      //         }}
      //       >
      //         {value || "-"}
      //       </span>
      //     );
      //   },
      // },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        render: (_, row) => {
          if (row.status?.toLowerCase().trim() === "inactive") return null;
          return (
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleEdit(row.beneficiary_id)}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleDeleteClick(row.beneficiary_id)}
              >
                Delete
              </Button>
            </Box>
          );
        },
      },
    ],
    [],
  );

  // ── Filter Fields ─────────────────────────────────────────────────────────
  useEffect(() => {
    setFilterFields([
      { key: "first_name", label: "First Name", type: "text" },
      { key: "last_name", label: "Last Name", type: "text" },
      { key: "mobile_no", label: "Contact No", type: "text" },
      { key: "national_id", label: "National ID", type: "text" },
      { key: "device_serial_no", label: "Device Serial No", type: "text" },
      { key: "females_below_18", label: "Females Below 18", type: "number" },
      { key: "females_above_18", label: "Females Above 18", type: "number" },
      { key: "males_below_18", label: "Males Below 18", type: "number" },
      { key: "males_above_18", label: "Males Above 18", type: "number" },
      {
        key: "training_site",
        label: "Training Site",
        type: "searchable",
        options: trainingSiteOptions,
        labelKey: "training_site",
        onSearch: searchTrainingSite,
      },
      {
        key: "cooking_method",
        label: "Cooking Method",
        type: "select",
        options: cookingMethodOptions.map((o) =>
          typeof o === "string"
            ? o
            : o.cookstove_name || o.cooking_method || "",
        ),
      },
      {
        key: "language",
        label: "Language",
        type: "select",
        options: languageOptions.map((o) =>
          typeof o === "string" ? o : o.lang_name || o.language || "",
        ),
      },
      {
        key: "other_cookstove",
        label: "Other Cookstove",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "read_doc",
        label: "Would you like to read this?",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "understood_doc",
        label: "Has the person understood the document?",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "read_to_you",
        label: "Would you like the document read to you?",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "stove_status_delivery",
        label: "Stove Good Condition",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "no_other_cook_stove_present",
        label: "No Other Stove",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "primary_residence_confirmation",
        label: "Primary Residence",
        type: "select",
        options: ["yes", "no"],
      },
      {
        key: "created_by",
        label: "Created By",
        type: "searchable",
        options: createOptions,
        labelKey: "name",
        onSearch: fetchUsers,
      },
      {
        key: "modified_by",
        label: "Modified By",
        type: "searchable",
        options: modifiedByOptions,
        labelKey: "name",
        onSearch: fetchUsers,
      },
      { key: "created_date", label: "Created Date", type: "date" },
      { key: "modified_date", label: "Modified Date", type: "date" },
      // {
      //   key: "status",
      //   label: "Status",
      //   type: "select",
      //   options: ["active", "inactive"],
      // },
    ]);
  }, [
    trainingSiteOptions,
    cookingMethodOptions,
    languageOptions,
    createOptions,
    modifiedByOptions,
  ]);

  useEffect(() => {
    fetchTrainingSites();
    fetchCookingMethods();
    fetchLanguages();
    fetchUsers();
  }, []);

  // ── API helpers ───────────────────────────────────────────────────────────
  const fetchTrainingSites = async (search = "") => {
    try {
      const res = await axios.get(`${API_BASE_URL}/training-site/getallSites`, {
        params: { search },
      });
      const raw = res.data?.data || [];
      const unique = raw.filter(
        (item, idx, arr) =>
          arr.findIndex((x) => x.training_site === item.training_site) === idx,
      );
      setTrainingSiteOptions(unique);
    } catch (error) {
      console.error("Training site fetch error:", error);
    }
  };

  const searchTrainingSite = async (query) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/training-site/getallSites`, {
        params: { search: query },
      });
      const raw = res.data?.data || [];
      const unique = raw.filter(
        (item, idx, arr) =>
          arr.findIndex((x) => x.training_site === item.training_site) === idx,
      );
      setTrainingSiteOptions(unique);
    } catch (error) {
      console.error("Training site search error:", error);
    }
  };

  const fetchCookingMethods = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/training-site/cookstove_slug`,
      );
      setCookingMethodOptions(res.data?.data || []);
    } catch (error) {
      console.error("Cooking method fetch error:", error);
    }
  };

  const fetchLanguages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/training-site/lang_slug`);
      setLanguageOptions(res.data?.data || []);
    } catch (error) {
      console.error("Language fetch error:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/user/getAllUsers`);
      setCreateOptions(res.data?.data || []);
      setModifiedByOptions(res.data?.data || []);
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
          `${API_BASE_URL}/beneficiary/list`,
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
          id: item.beneficiary_id,
          beneficiary_id: item.beneficiary_id,
          training_site: item.training_site,
          first_name: item.first_name,
          last_name: item.last_name,
          mobile_no: item.mobile_no,
          other_cookstove: item.other_cookstove,
          females_below_18: item.females_below_18 ?? "-",
          females_above_18: item.females_above_18 ?? "-",
          males_below_18: item.males_below_18 ?? "-",
          males_above_18: item.males_above_18 ?? "-",
          cooking_method: item.cooking_method,
          national_id: item.national_id,
          national_id_attachment: item.national_id_attachment || null,
          national_id_timestamp: item.national_id_timestamp ?? null,
          house_pic: item.house_pic || null,
          house_pic_timestamp: item.house_pic_timestamp ?? null,
          cookstove_pic: item.cookstove_pic || null,
          cookstove_pic_timestamp: item.cookstove_pic_timestamp ?? null,
          signature: item.signature || null,
          signature_timestamp: item.signature_timestamp ?? null,
          language: item.language,
          read_doc: item.read_doc,
          understood_doc: item.understood_doc,
          read_to_you: item.read_to_you,
          stove_status_delivery: item.stove_status_delivery,
          no_other_cook_stove_present: item.no_other_cook_stove_present,
          primary_residence_confirmation: item.primary_residence_confirmation,
          device_serial_no: item.device_serial_no,
          latitude: item.latitude ?? "-",
          longitude: item.longitude ?? "-",
          created_by_name: item.created_by_name,
          modified_by_name: item.modified_by_name,
          created_date: item.created_date ?? null,
          modified_date: item.modified_date ?? null,
          status: item.status,
        }));

        setTableData(mappedData);
        setTotalItems(response.totalRecords || 0);
        setTotalPages(response.totalPages || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load beneficiaries");
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

  const handleSubmitBeneficiary = async (formData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const fd = new FormData();

      fd.append("training_site", formData.training_site);
      fd.append("first_name", formData.first_name);
      fd.append("last_name", formData.last_name);
      fd.append("mobile_no", formData.mobile_no);
      fd.append("national_id", formData.national_id);
      fd.append("other_cookstove", formData.other_cookstove);
      fd.append("females_below_18", Number(formData.females_below_18) || 0);
      fd.append("females_above_18", Number(formData.females_above_18) || 0);
      fd.append("males_below_18", Number(formData.males_below_18) || 0);
      fd.append("males_above_18", Number(formData.males_above_18) || 0);
      fd.append("cooking_method", formData.cooking_method);
      fd.append("language", formData.language);
      fd.append("read_doc", formData.read_doc);
      fd.append("understood_doc", formData.understood_doc);
      fd.append("read_to_you", formData.read_to_you);
      fd.append("stove_status_delivery", formData.stove_status_delivery);
      fd.append(
        "no_other_cook_stove_present",
        formData.no_other_cook_stove_present,
      );
      fd.append(
        "primary_residence_confirmation",
        formData.primary_residence_confirmation,
      );
      fd.append("status", "active");
      if (formData.device_serial_no)
        fd.append("device_serial_no", formData.device_serial_no);
      if (formData.latitude) fd.append("latitude", formData.latitude);
      if (formData.longitude) fd.append("longitude", formData.longitude);

      const now = new Date().toISOString();
      const cache = pendingFilesRef.current;
      if (formData.national_id_attachment instanceof File)
        cache.national_id_attachment = formData.national_id_attachment;
      if (formData.signature instanceof File)
        cache.signature = formData.signature;
      if (formData.house_pic instanceof File)
        cache.house_pic = formData.house_pic;
      if (formData.cookstove_pic instanceof File)
        cache.cookstove_pic = formData.cookstove_pic;

      const resolveFile = (field) =>
        formData[field] instanceof File
          ? formData[field]
          : cache[field] instanceof File
            ? cache[field]
            : formData[field];

      const natId = resolveFile("national_id_attachment");
      const sig = resolveFile("signature");
      const house = resolveFile("house_pic");
      const stove = resolveFile("cookstove_pic");

      if (natId instanceof File) {
        fd.append("national_id_attachment", natId);
        fd.append("national_id_timestamp", now);
      } else if (natId === "REMOVED") {
        fd.append("remove_national_id", true);
      }
      if (sig instanceof File) {
        fd.append("signature", sig);
        fd.append("signature_timestamp", now);
      } else if (sig === "REMOVED") {
        fd.append("remove_signature", true);
      }
      if (house instanceof File) {
        fd.append("house_pic", house);
        fd.append("house_pic_timestamp", now);
      } else if (house === "REMOVED") {
        fd.append("remove_house_pic", true);
      }
      if (stove instanceof File) {
        fd.append("cookstove_pic", stove);
        fd.append("cookstove_pic_timestamp", now);
      } else if (stove === "REMOVED") {
        fd.append("remove_cookstove_pic", true);
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editId) {
        await axios.put(
          `${API_BASE_URL}/beneficiary/update-beneficiary/${editId}`,
          fd,
          config,
        );
        toast.success("Beneficiary updated successfully!");
      } else {
        await axios.post(
          `${API_BASE_URL}/beneficiary/create_beneficiary`,
          fd,
          config,
        );
        toast.success("Beneficiary created successfully!");
      }

      setPage(1);
      await fetchData(1, pageSize, activeFilters);

      if (editId) {
        try {
          const fresh = await axios.get(
            `${API_BASE_URL}/beneficiary/get_beneficiary/${editId}`,
          );
          const item = fresh.data?.data;
          if (item) {
            setEditData((prev) => ({
              ...prev,
              national_id_attachment: item.national_id_attachment || null,
              signature: item.signature || null,
              house_pic: item.house_pic || null,
              cookstove_pic: item.cookstove_pic || null,
            }));
          }
        } catch (_) {}
      }

      pendingFilesRef.current = {};
      setOpenDialog(false);
      setEditId(null);
      setEditData(null);
    } catch (error) {
      console.error("Submit error:", error);
      if (!error?.response) {
        toast.error("No internet connection.");
        return;
      }
      const raw = error?.response?.data?.message || "";
      const message = raw.includes("already exists")
        ? "National ID already exists"
        : raw || "Operation failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/beneficiary/get_beneficiary/${id}`,
      );
      const items = res.data?.data;
      if (!items || items.length === 0) {
        toast.error("Beneficiary not found");
        return;
      }
      const item = items;

      setEditData({
        training_site: item.training_site ?? "",
        first_name: item.first_name ?? "",
        last_name: item.last_name ?? "",
        mobile_no: item.mobile_no ?? "",
        national_id: item.national_id ?? "",
        other_cookstove: item.other_cookstove ?? "no",
        females_below_18: item.females_below_18 ?? "",
        females_above_18: item.females_above_18 ?? "",
        males_below_18: item.males_below_18 ?? "",
        males_above_18: item.males_above_18 ?? "",
        cooking_method: item.cooking_method ?? "",
        language: item.language ?? "",
        read_doc: item.read_doc ?? "no",
        understood_doc: item.understood_doc ?? "no",
        read_to_you: item.read_to_you ?? "no",
        stove_status_delivery: item.stove_status_delivery ?? "no",
        no_other_cook_stove_present: item.no_other_cook_stove_present ?? "no",
        primary_residence_confirmation:
          item.primary_residence_confirmation ?? "no",
        device_serial_no: item.device_serial_no ?? "",
        latitude: item.latitude ?? "",
        longitude: item.longitude ?? "",
        national_id_attachment: item.national_id_attachment || null,
        signature: item.signature || null,
        house_pic: item.house_pic || null,
        cookstove_pic: item.cookstove_pic || null,
      });

      setEditId(id);
      setOpenDialog(true);
    } catch (error) {
      console.error("Get by ID error:", error);
      toast.error("Failed to fetch beneficiary");
    } finally {
      setLoading(false);
    }
  };

  // ── Show confirmation dialog instead of deleting directly ─────────────────
  const handleDeleteClick = (id) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  // ── Called after user confirms in the dialog ───────────────────────────────
  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(
        `${API_BASE_URL}/beneficiary/delete_beneficiary/${pendingDeleteId}`,
        { status: "inactive" },
      );
      toast.success("Beneficiary marked as inactive!");
      await fetchData(page, pageSize, activeFilters);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setPendingDeleteId(null);
    }
  };

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
      `${API_BASE_URL}/beneficiary/list`,
      { filters: cleanFilters },
      { params: { page: 1, limit: 100000 } },
    );
    return res.data?.data ?? [];
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <h1 style={{ margin: 0 }}>Beneficiary</h1>
      <Breadcrumb
        homeLabel="Dashboard"
        items={[{ label: "Beneficiary", path: "/beneficiary" }]}
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
            fileName="Beneficiary"
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
          emptyText="No beneficiaries found"
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

      <CreateBeneficiaryDialog
        open={openDialog}
        onClose={() => {
          pendingFilesRef.current = {};
          setOpenDialog(false);
          setEditId(null);
          setEditData(null);
        }}
        onSubmit={handleSubmitBeneficiary}
        initialData={editData}
        trainingSiteOptions={trainingSiteOptions}
        cookingMethodOptions={cookingMethodOptions}
        languageOptions={languageOptions}
        onSearchTrainingSite={searchTrainingSite}
      />

      {/* ── Confirm Inactive Dialog ── */}
      <ConfirmInactiveDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Beneficiary"
        message="Are you sure you want to mark this Beneficiary as Inactive?"
      />
    </Box>
  );
};

export default Beneficiary;

// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { Box, Button, CircularProgress, Typography } from "@mui/material";
// import Breadcrumb from "../../components/Breadcrumb";
// import AppPagination from "../../components/AppPagination";
// import AppTable from "../../components/AppTable";
// import AppTableFilter from "../../components/AppTableFilter";
// import CreateBeneficiaryDialog from "./CreateBeneficiaryDialog";
// import axios from "axios";
// import { toast } from "react-toastify";
// import ExportButtons from "../../components/ExportButtons";
// import { API_BASE_URL } from "../../config";

// const BASE_IMAGE_URL = API_BASE_URL;

// // ── Build absolute URL from a relative path ───────────────────────────────────
// const buildImageUrl = (src) => {
//   if (!src || src === "-" || src === "null" || src === null) return null;
//   if (src.startsWith("http://") || src.startsWith("https://")) return src;
//   const path = src.startsWith("/") ? src : `/${src}`;
//   return `${BASE_IMAGE_URL}${path}`;
// };

// // ── Full-screen image preview modal ──────────────────────────────────────────
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
//         {/* Close button */}
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

// // ── Thumbnail cell component ──────────────────────────────────────────────────
// const ImageThumb = ({ src, alt }) => {
//   const [broken, setBroken] = React.useState(false);
//   const [preview, setPreview] = React.useState(false);

//   const fullSrc = buildImageUrl(src);

//   // Empty placeholder when no image or broken load
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

// // ── Date formatter helper ─────────────────────────────────────────────────────
// const fmtDate = (value) =>
//   value
//     ? new Date(value).toLocaleString(undefined, {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     : "-";

// // ── Main Component ────────────────────────────────────────────────────────────
// const Beneficiary = () => {
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

//   // ── CHANGE 1: Add pendingFilesRef to cache File objects across failed attempts ──
//   const pendingFilesRef = React.useRef({});

//   const [trainingSiteOptions, setTrainingSiteOptions] = useState([]);
//   const [cookingMethodOptions, setCookingMethodOptions] = useState([]);
//   const [languageOptions, setLanguageOptions] = useState([]);
//   const [createOptions, setCreateOptions] = useState([]);
//   const [modifiedByOptions, setModifiedByOptions] = useState([]);

//   // ── Columns ───────────────────────────────────────────────────────────────
//   const columns = useMemo(
//     () => [
//       { key: "beneficiary_id", label: "Beneficiary ID", align: "center" },
//       { key: "first_name", label: "First Name" },
//       { key: "last_name", label: "Last Name" },
//       { key: "training_site", label: "Training Site" },
//       { key: "mobile_no", label: "Contact No", align: "center" },
//       { key: "national_id", label: "National ID", align: "center" },
//       { key: "cooking_method", label: "Cooking Method" },
//       { key: "language", label: "Language", align: "center" },
//       { key: "other_cookstove", label: "Other Cookstove", align: "center" },
//       { key: "females_below_18", label: "Females <18", align: "center" },
//       { key: "females_above_18", label: "Females >18", align: "center" },
//       { key: "males_below_18", label: "Males <18", align: "center" },
//       { key: "males_above_18", label: "Males >18", align: "center" },
//       {
//         key: "national_id_attachment",
//         label: "National Id Attachment",
//         align: "center",
//         render: (value) => <ImageThumb src={value} alt="National ID" />,
//       },

//       {
//         key: "house_pic",
//         label: "House Pic",
//         align: "center",
//         render: (value) => <ImageThumb src={value} alt="House" />,
//       },
//       {
//         key: "cookstove_pic",
//         label: "Cookstove Pic",
//         align: "center",
//         render: (value) => <ImageThumb src={value} alt="Cookstove" />,
//       },

//       {
//         key: "signature",
//         label: "Signature",
//         align: "center",
//         render: (value) => <ImageThumb src={value} alt="Signature" />,
//       },
//       {
//         key: "national_id_timestamp",
//         label: "National ID Timestamp",
//         align: "center",
//         render: fmtDate,
//       },
//       {
//         key: "house_pic_timestamp",
//         label: "House Pic Timestamp",
//         align: "center",
//         render: fmtDate,
//       },
//       {
//         key: "cookstove_pic_timestamp",
//         label: "Cookstove Pic Timestamp",
//         align: "center",
//         render: fmtDate,
//       },
//       {
//         key: "signature_timestamp",
//         label: "Signature Timestamp",
//         align: "center",
//         render: fmtDate,
//       },
//       {
//         key: "read_doc",
//         label: "Would you like to read this?",
//         align: "center",
//       },
//       {
//         key: "understood_doc",
//         label: "Has the person understood the document?",
//         align: "center",
//       },
//       {
//         key: "read_to_you",
//         label: "Would you like the document read to you?",
//         align: "center",
//       },
//       {
//         key: "stove_status_delivery",
//         label: "Stove Good Condition",
//         align: "center",
//       },
//       {
//         key: "no_other_cook_stove_present",
//         label: "No Other Stove",
//         align: "center",
//       },
//       {
//         key: "primary_residence_confirmation",
//         label: "Primary Residence",
//         align: "center",
//       },
//       { key: "device_serial_no", label: "Device Serial No", align: "center" },
//       { key: "latitude", label: "Latitude", align: "center" },
//       { key: "longitude", label: "Longitude", align: "center" },
//       { key: "created_by_name", label: "Created By", align: "center" },
//       { key: "modified_by_name", label: "Modified By", align: "center" },
//       // {
//       //   key: "created_date",
//       //   label: "Created Date",
//       //   align: "center",
//       //   render: fmtDate,
//       // },
//       {
//         key: "created_date",
//         label: "Created Date",
//         align: "center",
//         render: (value) =>
//           value
//             ? new Date(value).toLocaleString(undefined, {
//                 day: "2-digit",
//                 month: "short",
//                 year: "numeric",
//                 hour: "2-digit",
//                 minute: "2-digit",
//                 timeZone: "UTC",
//               })
//             : "-",
//       },
//       {
//         key: "modified_date",
//         label: "Modified Date",
//         align: "center",
//         render: fmtDate,
//       },
//       {
//         key: "status",
//         label: "Status",
//         align: "center",
//         render: (value) => {
//           const status = value?.toLowerCase().trim();

//           return (
//             <span
//               style={{
//                 color: status === "active" ? "green" : "red",
//                 fontWeight: 600,
//               }}
//             >
//               {value || "-"}
//             </span>
//           );
//         },
//       },
//       {
//         key: "actions",
//         label: "Actions",
//         align: "center",
//         // render: (_, row) => (
//         //   <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
//         //     <Button
//         //       size="small"
//         //       variant="outlined"
//         //       onClick={() => handleEdit(row.beneficiary_id)}
//         //     >
//         //       Edit
//         //     </Button>
//         //     <Button
//         //       size="small"
//         //       variant="outlined"
//         //       color="error"
//         //       onClick={() => handleDelete(row.beneficiary_id)}
//         //     >
//         //       Delete
//         //     </Button>
//         //   </Box>
//         // ),
//         render: (_, row) => {
//           if (row.status?.toLowerCase().trim() === "inactive") return null;

//           return (
//             <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
//               <Button
//                 size="small"
//                 variant="outlined"
//                 onClick={() => handleEdit(row.beneficiary_id)}
//               >
//                 Edit
//               </Button>
//               <Button
//                 size="small"
//                 variant="outlined"
//                 color="error"
//                 onClick={() => handleDelete(row.beneficiary_id)}
//               >
//                 Delete
//               </Button>
//             </Box>
//           );
//         },
//       },
//     ],
//     [],
//   );

//   // ── Filter Fields ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     setFilterFields([
//       { key: "first_name", label: "First Name", type: "text" },
//       { key: "last_name", label: "Last Name", type: "text" },
//       { key: "mobile_no", label: "Contact No", type: "text" },
//       { key: "national_id", label: "National ID", type: "text" },
//       { key: "device_serial_no", label: "Device Serial No", type: "text" },

//       { key: "females_below_18", label: "Females Below 18", type: "number" },
//       { key: "females_above_18", label: "Females Above 18", type: "number" },
//       { key: "males_below_18", label: "Males Below 18", type: "number" },
//       { key: "males_above_18", label: "Males Above 18", type: "number" },
//       {
//         key: "training_site",
//         label: "Training Site",
//         type: "searchable",
//         options: trainingSiteOptions,
//         labelKey: "training_site",
//         onSearch: searchTrainingSite,
//       },
//       {
//         key: "cooking_method",
//         label: "Cooking Method",
//         type: "select",
//         options: cookingMethodOptions.map((o) =>
//           typeof o === "string"
//             ? o
//             : o.cookstove_name || o.cooking_method || "",
//         ),
//       },
//       {
//         key: "language",
//         label: "Language",
//         type: "select",
//         options: languageOptions.map((o) =>
//           typeof o === "string" ? o : o.lang_name || o.language || "",
//         ),
//       },
//       {
//         key: "other_cookstove",
//         label: "Other Cookstove",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "read_doc",
//         label: "Would you like to read this?",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "understood_doc",
//         label: "Has the person understood the document?",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "read_to_you",
//         label: "Would you like the document read to you?",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "stove_status_delivery",
//         label: "Stove Good Condition",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "no_other_cook_stove_present",
//         label: "No Other Stove",
//         type: "select",
//         options: ["yes", "no"],
//       },
//       {
//         key: "primary_residence_confirmation",
//         label: "Primary Residence",
//         type: "select",
//         options: ["yes", "no"],
//       },

//       {
//         key: "created_by",
//         label: "Created By",
//         type: "searchable",
//         options: createOptions,
//         labelKey: "name",
//         onSearch: fetchUsers,
//       },
//       {
//         key: "modified_by",
//         label: "Modified By",
//         type: "searchable",
//         options: modifiedByOptions,
//         labelKey: "name",
//         onSearch: fetchUsers,
//       },
//       { key: "created_date", label: "Created Date", type: "date" },
//       { key: "modified_date", label: "Modified Date", type: "date" },
//     ]);
//   }, [
//     trainingSiteOptions,
//     cookingMethodOptions,
//     languageOptions,
//     createOptions,
//     modifiedByOptions,
//   ]);

//   useEffect(() => {
//     fetchTrainingSites();
//     fetchCookingMethods();
//     fetchLanguages();
//     fetchUsers();
//   }, []);

//   // ── API helpers ───────────────────────────────────────────────────────────
//   // const fetchTrainingSites = async (search = "") => {
//   //   try {
//   //     const res = await axios.get(`${API_BASE_URL}/training-site/getallSites`, {
//   //       params: { search },
//   //     });
//   //     setTrainingSiteOptions(res.data?.data || []);
//   //   } catch (error) {
//   //     console.error("Training site fetch error:", error);
//   //   }
//   // };

//   // const searchTrainingSite = async (query) => {
//   //   try {
//   //     const res = await axios.get(`${API_BASE_URL}/training-site/getallSites`, {
//   //       params: { search: query },
//   //     });
//   //     setTrainingSiteOptions(res.data?.data || []);
//   //   } catch (error) {
//   //     console.error("Training site search error:", error);
//   //   }
//   // };

//   const fetchTrainingSites = async (search = "") => {
//     try {
//       const res = await axios.get(`${API_BASE_URL}/training-site/getallSites`, {
//         params: { search },
//       });
//       const raw = res.data?.data || [];
//       const unique = raw.filter(
//         (item, idx, arr) =>
//           arr.findIndex((x) => x.training_site === item.training_site) === idx,
//       );
//       setTrainingSiteOptions(unique); // ← DEDUPLICATED
//     } catch (error) {
//       console.error("Training site fetch error:", error);
//     }
//   };
//   const searchTrainingSite = async (query) => {
//     try {
//       const res = await axios.get(`${API_BASE_URL}/training-site/getallSites`, {
//         params: { search: query },
//       });
//       const raw = res.data?.data || [];
//       const unique = raw.filter(
//         (item, idx, arr) =>
//           arr.findIndex((x) => x.training_site === item.training_site) === idx,
//       );
//       setTrainingSiteOptions(unique); // ← DEDUPLICATED
//     } catch (error) {
//       console.error("Training site search error:", error);
//     }
//   };

//   const fetchCookingMethods = async () => {
//     try {
//       const res = await axios.get(
//         `${API_BASE_URL}/training-site/cookstove_slug`,
//       );
//       setCookingMethodOptions(res.data?.data || []);
//     } catch (error) {
//       console.error("Cooking method fetch error:", error);
//     }
//   };

//   const fetchLanguages = async () => {
//     try {
//       const res = await axios.get(`${API_BASE_URL}/training-site/lang_slug`);
//       setLanguageOptions(res.data?.data || []);
//     } catch (error) {
//       console.error("Language fetch error:", error);
//     }
//   };

//   const fetchUsers = async () => {
//     try {
//       const res = await axios.get(`${API_BASE_URL}/user/getAllUsers`);
//       setCreateOptions(res.data?.data || []);
//       setModifiedByOptions(res.data?.data || []);
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
//           `${API_BASE_URL}/beneficiary/list`,
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
//           id: item.beneficiary_id,
//           beneficiary_id: item.beneficiary_id,
//           training_site: item.training_site,
//           first_name: item.first_name,
//           last_name: item.last_name,
//           mobile_no: item.mobile_no,
//           other_cookstove: item.other_cookstove,
//           females_below_18: item.females_below_18 ?? "-",
//           females_above_18: item.females_above_18 ?? "-",
//           males_below_18: item.males_below_18 ?? "-",
//           males_above_18: item.males_above_18 ?? "-",
//           cooking_method: item.cooking_method,
//           national_id: item.national_id,
//           // image paths — keep raw so ImageThumb builds the URL
//           national_id_attachment: item.national_id_attachment || null,
//           national_id_timestamp: item.national_id_timestamp ?? null,
//           house_pic: item.house_pic || null,
//           house_pic_timestamp: item.house_pic_timestamp ?? null,
//           cookstove_pic: item.cookstove_pic || null,
//           cookstove_pic_timestamp: item.cookstove_pic_timestamp ?? null,
//           signature: item.signature || null,
//           signature_timestamp: item.signature_timestamp ?? null,
//           language: item.language,
//           read_doc: item.read_doc,
//           understood_doc: item.understood_doc,
//           read_to_you: item.read_to_you,
//           stove_status_delivery: item.stove_status_delivery,
//           no_other_cook_stove_present: item.no_other_cook_stove_present,
//           primary_residence_confirmation: item.primary_residence_confirmation,
//           device_serial_no: item.device_serial_no,
//           latitude: item.latitude ?? "-",
//           longitude: item.longitude ?? "-",
//           created_by_name: item.created_by_name,
//           modified_by_name: item.modified_by_name,
//           created_date: item.created_date ?? null,
//           modified_date: item.modified_date ?? null,
//           status: item.status,
//         }));

//         setTableData(mappedData);
//         setTotalItems(response.totalRecords || 0);
//         setTotalPages(response.totalPages || 0);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//         toast.error("Failed to load beneficiaries");
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

//   const handleSubmitBeneficiary = async (formData) => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");

//       // Build FormData so image files are sent as multipart/form-data
//       const fd = new FormData();

//       // Text fields
//       fd.append("training_site", formData.training_site);
//       fd.append("first_name", formData.first_name);
//       fd.append("last_name", formData.last_name);
//       fd.append("mobile_no", formData.mobile_no);
//       fd.append("national_id", formData.national_id);
//       fd.append("other_cookstove", formData.other_cookstove);
//       fd.append("females_below_18", Number(formData.females_below_18) || 0);
//       fd.append("females_above_18", Number(formData.females_above_18) || 0);
//       fd.append("males_below_18", Number(formData.males_below_18) || 0);
//       fd.append("males_above_18", Number(formData.males_above_18) || 0);
//       fd.append("cooking_method", formData.cooking_method);
//       fd.append("language", formData.language);
//       fd.append("read_doc", formData.read_doc);
//       fd.append("understood_doc", formData.understood_doc);
//       fd.append("read_to_you", formData.read_to_you);
//       fd.append("stove_status_delivery", formData.stove_status_delivery);
//       fd.append(
//         "no_other_cook_stove_present",
//         formData.no_other_cook_stove_present,
//       );
//       fd.append(
//         "primary_residence_confirmation",
//         formData.primary_residence_confirmation,
//       );
//       fd.append("status", "active");
//       if (formData.device_serial_no)
//         fd.append("device_serial_no", formData.device_serial_no);
//       if (formData.latitude) fd.append("latitude", formData.latitude);
//       if (formData.longitude) fd.append("longitude", formData.longitude);

//       const now = new Date().toISOString();

//       // ── CHANGE 2: Cache File objects so they survive a failed attempt & retry ──
//       const cache = pendingFilesRef.current;
//       if (formData.national_id_attachment instanceof File)
//         cache.national_id_attachment = formData.national_id_attachment;
//       if (formData.signature instanceof File)
//         cache.signature = formData.signature;
//       if (formData.house_pic instanceof File)
//         cache.house_pic = formData.house_pic;
//       if (formData.cookstove_pic instanceof File)
//         cache.cookstove_pic = formData.cookstove_pic;

//       // Resolve final file: prefer live File, fall back to cached File
//       const resolveFile = (field) =>
//         formData[field] instanceof File
//           ? formData[field]
//           : cache[field] instanceof File
//             ? cache[field]
//             : formData[field]; // "REMOVED" or null

//       const natId = resolveFile("national_id_attachment");
//       const sig = resolveFile("signature");
//       const house = resolveFile("house_pic");
//       const stove = resolveFile("cookstove_pic");

//       if (natId instanceof File) {
//         fd.append("national_id_attachment", natId);
//         fd.append("national_id_timestamp", now);
//       } else if (natId === "REMOVED") {
//         fd.append("remove_national_id", true);
//       }

//       if (sig instanceof File) {
//         fd.append("signature", sig);
//         fd.append("signature_timestamp", now);
//       } else if (sig === "REMOVED") {
//         fd.append("remove_signature", true);
//       }

//       if (house instanceof File) {
//         fd.append("house_pic", house);
//         fd.append("house_pic_timestamp", now);
//       } else if (house === "REMOVED") {
//         fd.append("remove_house_pic", true);
//       }

//       if (stove instanceof File) {
//         fd.append("cookstove_pic", stove);
//         fd.append("cookstove_pic_timestamp", now);
//       } else if (stove === "REMOVED") {
//         fd.append("remove_cookstove_pic", true);
//       }
//       // ── END CHANGE 2 ──

//       const config = {
//         headers: { Authorization: `Bearer ${token}` },
//       };

//       // if (editId) {
//       //   await axios.put(
//       //     `${API_BASE_URL}/beneficiary/update-beneficiary/${editId}`,
//       //     fd,
//       //     config,
//       //   );
//       //   toast.success("Beneficiary updated successfully!");
//       // } else {
//       //   await axios.post(
//       //     `${API_BASE_URL}/beneficiary/create_beneficiary`,
//       //     fd,
//       //     config,
//       //   );
//       //   toast.success("Beneficiary created successfully!");
//       // }

//       // setPage(1);
//       // await fetchData(1, pageSize, activeFilters);
//       // setOpenDialog(false);
//       // setEditId(null);
//       // setEditData(null);
//       if (editId) {
//         await axios.put(
//           `${API_BASE_URL}/beneficiary/update-beneficiary/${editId}`,
//           fd,
//           config,
//         );
//         toast.success("Beneficiary updated successfully!");
//       } else {
//         await axios.post(
//           `${API_BASE_URL}/beneficiary/create_beneficiary`,
//           fd,
//           config,
//         );
//         toast.success("Beneficiary created successfully!");
//       }

//       setPage(1);
//       await fetchData(1, pageSize, activeFilters);

//       // Re-fetch fresh image URLs so the dialog shows updated images if reopened
//       if (editId) {
//         try {
//           const fresh = await axios.get(
//             `${API_BASE_URL}/beneficiary/get_beneficiary/${editId}`,
//           );
//           const item = fresh.data?.data;
//           if (item) {
//             setEditData((prev) => ({
//               ...prev,
//               national_id_attachment: item.national_id_attachment || null,
//               signature: item.signature || null,
//               house_pic: item.house_pic || null,
//               cookstove_pic: item.cookstove_pic || null,
//             }));
//           }
//         } catch (_) {
//           // non-critical, ignore
//         }
//       }

//       // ── CHANGE 3: Clear cache on success ──
//       pendingFilesRef.current = {};

//       setOpenDialog(false);
//       setEditId(null);
//       setEditData(null);
//     } catch (error) {
//       console.error("Submit error:", error);
//       if (!error?.response) {
//         toast.error("No internet connection.");
//         return;
//       }
//       const raw = error?.response?.data?.message || "";
//       const message = raw.includes("already exists")
//         ? "National ID already exists"
//         : raw || "Operation failed. Please try again.";
//       toast.error(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleEdit = async (id) => {
//     try {
//       setLoading(true);
//       const res = await axios.get(
//         `${API_BASE_URL}/beneficiary/get_beneficiary/${id}`,
//       );
//       const items = res.data?.data;
//       if (!items || items.length === 0) {
//         toast.error("Beneficiary not found");
//         return;
//       }
//       const item = items;

//       setEditData({
//         training_site: item.training_site ?? "",
//         first_name: item.first_name ?? "",
//         last_name: item.last_name ?? "",
//         mobile_no: item.mobile_no ?? "",
//         national_id: item.national_id ?? "",
//         other_cookstove: item.other_cookstove ?? "no",
//         females_below_18: item.females_below_18 ?? "",
//         females_above_18: item.females_above_18 ?? "",
//         males_below_18: item.males_below_18 ?? "",
//         males_above_18: item.males_above_18 ?? "",
//         cooking_method: item.cooking_method ?? "",
//         language: item.language ?? "",
//         read_doc: item.read_doc ?? "no",
//         understood_doc: item.understood_doc ?? "no",
//         read_to_you: item.read_to_you ?? "no",
//         stove_status_delivery: item.stove_status_delivery ?? "no",
//         no_other_cook_stove_present: item.no_other_cook_stove_present ?? "no",
//         primary_residence_confirmation:
//           item.primary_residence_confirmation ?? "no",
//         device_serial_no: item.device_serial_no ?? "",
//         latitude: item.latitude ?? "",
//         longitude: item.longitude ?? "",
//         // Image paths from server (strings, not File objects)
//         national_id_attachment: item.national_id_attachment || null,
//         signature: item.signature || null,
//         house_pic: item.house_pic || null,
//         cookstove_pic: item.cookstove_pic || null,
//       });

//       setEditId(id);
//       setOpenDialog(true);
//     } catch (error) {
//       console.error("Get by ID error:", error);
//       toast.error("Failed to fetch beneficiary");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     try {
//       await axios.delete(
//         `${API_BASE_URL}/beneficiary/delete_beneficiary/${id}`,
//         { status: "inactive" },
//       );
//       //     toast.success("Beneficiary deleted successfully!");
//       //     await fetchData(page, pageSize, activeFilters);
//       //   } catch (error) {
//       //     toast.error("Failed to delete beneficiary");
//       //   }
//       // };
//       toast.success("Beneficiary marked as inactive!");
//       await fetchData(page, pageSize, activeFilters);
//     } catch (error) {
//       toast.error("Failed to update status");
//     }
//   };
//   const fetchAllForExport = async () => {
//     // ← ADD THIS BLOCK
//     const cleanFilters =
//       Array.isArray(activeFilters) && activeFilters.length > 0
//         ? activeFilters.map(({ field, operator, value }) => ({
//             field,
//             operator,
//             value,
//           }))
//         : [];
//     const res = await axios.post(
//       `${API_BASE_URL}/beneficiary/list`,
//       { filters: cleanFilters },
//       { params: { page: 1, limit: 100000 } },
//     );
//     return res.data?.data ?? [];
//   };

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <Box>
//       <h1 style={{ margin: 0 }}>Beneficiary</h1>
//       <Breadcrumb
//         homeLabel="Dashboard"
//         items={[{ label: "Beneficiary", path: "/beneficiary" }]}
//       />

//       {/* Top Row */}
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
//             fileName="Beneficiary"
//             onExportAll={fetchAllForExport}
//           />
//           <Button
//             variant="contained"
//             sx={{
//               textTransform: "none",
//               fontWeight: 600,
//               borderRadius: "10px",
//               px: 3,
//               boxShadow: "none",
//               background: "#4CAF50",
//             }}
//             onClick={() => setOpenDialog(true)}
//           >
//             Create
//           </Button>
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
//           emptyText="No beneficiaries found"
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

//       <CreateBeneficiaryDialog
//         open={openDialog}
//         onClose={() => {
//           // ── CHANGE 4: Clear cache on dialog cancel/close ──
//           pendingFilesRef.current = {};
//           setOpenDialog(false);
//           setEditId(null);
//           setEditData(null);
//         }}
//         onSubmit={handleSubmitBeneficiary}
//         initialData={editData}
//         trainingSiteOptions={trainingSiteOptions}
//         cookingMethodOptions={cookingMethodOptions}
//         languageOptions={languageOptions}
//         onSearchTrainingSite={searchTrainingSite}
//       />
//     </Box>
//   );
// };

// export default Beneficiary;
