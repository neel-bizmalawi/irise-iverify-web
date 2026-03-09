import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Grid,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormHelperText,
  Box,
  Typography,
  MenuItem,
  Zoom,
  useTheme,
  useMediaQuery,
  FormControl,
  Select,
  InputBase,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";

// Icons
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import RadarOutlinedIcon from "@mui/icons-material/RadarOutlined";
import ForestOutlinedIcon from "@mui/icons-material/ForestOutlined";
import { API_BASE_URL } from "../../../config";
import SearchableCreatableSelect from "../../components/SearchableCreatableSelect";

const initialValues = {
  trainingSiteName: "",
  district: "",
  groupVillageHead: "",
  villageHeadName: "",
  traditionalAuthority: "",
  totalCookstoves: "",
  totalHouseHolds: "",
  houseHoldRadius: "",
  totalPeople: "",
  roadAccess: "No",
};
// ── Validation Schema ─────────────────────────────────────────────────────────
const validationSchema = Yup.object({
  trainingSiteName: Yup.string()
    .matches(/^[A-Za-z\s]+$/, "Only letters are allowed")
    .required("Training site name is required"),
  district: Yup.string().required("District is required"),
  traditionalAuthority: Yup.string().required(
    "Traditional authority is required",
  ),
  groupVillageHead: Yup.string()
    .matches(/^[A-Za-z\s]+$/, "Only letters are allowed")
    .required("Group village head is required"),
  villageHeadName: Yup.string()
    .matches(/^[A-Za-z\s]+$/, "Only letters are allowed")
    .required("Village head name is required"),
  totalCookstoves: Yup.number()
    .typeError("Must be a number")
    .min(0, "Cannot be negative")
    .required("Total cookstoves is required"),
  totalHouseHolds: Yup.number()
    .typeError("Must be a number")
    .min(0, "Cannot be negative")
    .required("Total households is required"),
  totalPeople: Yup.number()
    .typeError("Must be a number")
    .min(0, "Cannot be negative")
    .required("Total people is required"),
  houseHoldRadius: Yup.number()
    .typeError("Must be a number")
    .min(0, "Cannot be negative")
    .required("Household radius is required"),
  roadAccess: Yup.string().oneOf(["Yes", "No"]).required(),
});
// ── Styled Field Label ────────────────────────────────────────────────────────
const FieldLabel = ({ icon: Icon, label, required }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
    {Icon && <Icon sx={{ fontSize: 15, color: "#6b7280" }} />}
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        color: "#374151",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontSize: "0.68rem",
      }}
    >
      {label}
      {required && (
        <Box component="span" sx={{ color: "#ef4444", ml: 0.3 }}>
          *
        </Box>
      )}
    </Typography>
  </Box>
);

// ── Styled Input ──────────────────────────────────────────────────────────────
const StyledInput = ({
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  error,
}) => (
  <InputBase
    type={type}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    fullWidth
    sx={{
      border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
      borderRadius: "10px",
      px: 1.75,
      py: 1.1,
      fontSize: "0.88rem",
      color: "#111827",
      background: "#ffffff",
      transition: "all 0.2s ease",
      "& input": {
        "&::placeholder": { color: "#b0b7c3", fontSize: "0.85rem" },
      },
      "&:hover": {
        borderColor: error ? "#ef4444" : "#9ca3af",
        background: "#fafafa",
      },
      "&.Mui-focused": {
        borderColor: error ? "#ef4444" : "#16a34a",
        background: "#fff",
        boxShadow: error
          ? "0 0 0 3px rgba(239, 68, 68, 0.1)"
          : "0 0 0 3px rgba(22, 163, 74, 0.1)",
      },
    }}
  />
);

// ── Main Component ────────────────────────────────────────────────────────────
const CreateTrainingSiteDialog = ({ open, onClose, onSubmit, initialData }) => {
  const [districtOptions, setDistrictOptions] = React.useState([]);
  const [authorityOptions, setAuthorityOptions] = React.useState([]);
  const [districtLoading, setDistrictLoading] = React.useState(false);
  const [authorityLoading, setAuthorityLoading] = React.useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isEdit = Boolean(initialData);

  // ── Formik ──────────────────────────────────────────────────────────────────
  const formik = useFormik({
    initialValues: initialData
      ? { ...initialValues, ...initialData }
      : initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        await onSubmit?.(values);
        resetForm();
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      formik.resetForm();
    }
  }, [open]);

  // ── API Calls ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const fetchDistricts = async () => {
      try {
        setDistrictLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/training-site/district_slug`,
        );
        setDistrictOptions(res.data?.data || []);
      } catch (error) {
        console.error("District fetch error:", error);
      } finally {
        setDistrictLoading(false);
      }
    };
    fetchDistricts();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fetchAuthorities = async () => {
      try {
        setAuthorityLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/training-site/authority_slug`,
        );
        setAuthorityOptions(res.data?.data || []);
      } catch (error) {
        console.error("Authority fetch error:", error);
      } finally {
        setAuthorityLoading(false);
      }
    };
    fetchAuthorities();
  }, [open]);

  const searchDistrict = async (query) => {
    try {
      setDistrictLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/training-site/search-district`,
        {
          params: { search: query },
        },
      );
      setDistrictOptions(res.data?.data || []);
    } catch (error) {
      console.error("District search error:", error);
    } finally {
      setDistrictLoading(false);
    }
  };

  const searchAuthority = async (query) => {
    try {
      setAuthorityLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/training-site/search-authority`,
        {
          params: { search: query },
        },
      );
      setAuthorityOptions(res.data?.data || []);
    } catch (error) {
      console.error("Authority search error:", error);
    } finally {
      setAuthorityLoading(false);
    }
  };

  const createDistrict = async (name) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/training-site/create_district`,
        { district: name },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const newDistrict = res.data.data;
      setDistrictOptions((prev) => [...prev, newDistrict]);
      formik.setFieldValue("district", newDistrict?.district_name);
    } catch (error) {
      console.error("Add district error:", error);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      scroll="paper"
      TransitionComponent={Zoom}
      TransitionProps={{ timeout: 280 }}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: isMobile ? 0 : "20px",
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          boxShadow:
            "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        },
      }}
      BackdropProps={{
        sx: {
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #166534 0%, #16a34a 60%, #4ade80 100%)",
          px: 4,
          pt: 3.5,
          pb: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -20,
            right: 80,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />

        {/* <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.75 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ForestOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />
          </Box>
          <Chip
            label={isEdit ? "Edit Mode" : "New Entry"}
            size="small"
            sx={{
              background: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.9)",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              height: 22,
              "& .MuiChip-label": { px: 1.2 },
            }}
          />
        </Box> */}

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "#ffffff",
            fontSize: "1.2rem",
            letterSpacing: "-0.01em",
          }}
        >
          {isEdit ? "Update Training Site" : "Create Training Site"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, fontSize: "0.8rem" }}
        >
          {isEdit
            ? "Modify the details of this training site below."
            : "Fill in the details to register a new training site."}
        </Typography>
      </Box>

      {/* ── Form Body ── */}
      <DialogContent
        sx={{ px: { xs: 2.5, sm: 4 }, py: 3.5, background: "#f8fafc" }}
      >
        <Grid container spacing={2.5}>
          {/* Training Site Name */}
          <Grid item xs={12} md={6}>
            <FormControl
              fullWidth
              error={
                formik.touched.trainingSiteName &&
                Boolean(formik.errors.trainingSiteName)
              }
            >
              <FieldLabel
                icon={LocationOnOutlinedIcon}
                label="Training Site Name"
                required
              />
              <StyledInput
                value={formik.values.trainingSiteName}
                onChange={formik.handleChange("trainingSiteName")}
                onBlur={formik.handleBlur("trainingSiteName")}
                placeholder="e.g. Lilongwe North Site"
                error={
                  formik.touched.trainingSiteName &&
                  Boolean(formik.errors.trainingSiteName)
                }
              />
              {formik.touched.trainingSiteName &&
                formik.errors.trainingSiteName && (
                  <FormHelperText>
                    {formik.errors.trainingSiteName}
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>

          {/* District */}
          <Grid item xs={12} md={6}>
            <FormControl
              fullWidth
              error={formik.touched.district && Boolean(formik.errors.district)}
            >
              <FieldLabel
                icon={LocationOnOutlinedIcon}
                label="District"
                required
              />
              <SearchableCreatableSelect
                label="Search District"
                value={formik.values.district}
                error={formik.touched.district && Boolean(formik.errors.district)}
                options={districtOptions}
                loading={districtLoading}
                labelKey="district_name"
                onSearch={searchDistrict}
                onChange={(val) => {
                  formik.setFieldValue("district", val?.district_name ?? "");
                  formik.setFieldTouched("district", true, false);
                }}
                onCreate={createDistrict}
                allowCreate={false}
              />
              {formik.touched.district && formik.errors.district && (
                <FormHelperText error>{formik.errors.district}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Traditional Authority */}
          <Grid item xs={12} md={6}>
            <FormControl
              fullWidth
              error={
                formik.touched.traditionalAuthority &&
                Boolean(formik.errors.traditionalAuthority)
              }
            >
              <FieldLabel
                icon={AccountBalanceOutlinedIcon}
                label="Traditional Authority"
                required
              />
              <SearchableCreatableSelect
                label="Search Authority"
                value={formik.values.traditionalAuthority}
                error={formik.touched.traditionalAuthority && Boolean(formik.errors.traditionalAuthority)}
                options={authorityOptions}
                loading={authorityLoading}
                labelKey="authority_name"
                onSearch={searchAuthority}
                onChange={(val) => {
                  formik.setFieldValue(
                    "traditionalAuthority",
                    val?.authority_name ?? "",
                  );
                  formik.setFieldTouched("traditionalAuthority", true, false);
                }}
                onCreate={createDistrict}
                allowCreate={false}
              />
              {formik.touched.traditionalAuthority &&
                formik.errors.traditionalAuthority && (
                  <FormHelperText>
                    {formik.errors.traditionalAuthority}
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>

          {/* Group Village Head */}
          <Grid item xs={12} md={6}>
            <FormControl
              fullWidth
              error={
                formik.touched.groupVillageHead &&
                Boolean(formik.errors.groupVillageHead)
              }
            >
              <FieldLabel
                icon={PersonOutlineOutlinedIcon}
                label="Group Village Head"
                required
              />
              <StyledInput
                value={formik.values.groupVillageHead}
                onChange={formik.handleChange("groupVillageHead")}
                onBlur={formik.handleBlur("groupVillageHead")}
                placeholder="e.g. GVH Mwale"
                error={
                  formik.touched.groupVillageHead &&
                  Boolean(formik.errors.groupVillageHead)
                }
              />
              {formik.touched.groupVillageHead &&
                formik.errors.groupVillageHead && (
                  <FormHelperText>
                    {formik.errors.groupVillageHead}
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>

          {/* Village Head Name */}
          <Grid item xs={12} md={6}>
            <FormControl
              fullWidth
              error={
                formik.touched.villageHeadName &&
                Boolean(formik.errors.villageHeadName)
              }
            >
              <FieldLabel
                icon={PersonOutlineOutlinedIcon}
                label="Village Head Name"
                required
              />
              <StyledInput
                value={formik.values.villageHeadName}
                onChange={formik.handleChange("villageHeadName")}
                onBlur={formik.handleBlur("villageHeadName")}
                placeholder="Full name"
                error={
                  formik.touched.villageHeadName &&
                  Boolean(formik.errors.villageHeadName)
                }
              />
              {formik.touched.villageHeadName &&
                formik.errors.villageHeadName && (
                  <FormHelperText>
                    {formik.errors.villageHeadName}
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>

          {/* Total Cookstoves */}
          <Grid item xs={12} md={4}>
            <FormControl
              fullWidth
              error={
                formik.touched.totalCookstoves &&
                Boolean(formik.errors.totalCookstoves)
              }
            >
              <FieldLabel
                icon={LocalFireDepartmentOutlinedIcon}
                label="Total Cookstoves"
                required
              />
              <StyledInput
                type="number"
                value={formik.values.totalCookstoves}
                onChange={formik.handleChange("totalCookstoves")}
                onBlur={formik.handleBlur("totalCookstoves")}
                placeholder="0"
                error={
                  formik.touched.totalCookstoves &&
                  Boolean(formik.errors.totalCookstoves)
                }
              />
              {formik.touched.totalCookstoves &&
                formik.errors.totalCookstoves && (
                  <FormHelperText>
                    {formik.errors.totalCookstoves}
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>

          {/* Total Households */}
          <Grid item xs={12} md={4}>
            <FormControl
              fullWidth
              error={
                formik.touched.totalHouseHolds &&
                Boolean(formik.errors.totalHouseHolds)
              }
            >
              <FieldLabel
                icon={HomeOutlinedIcon}
                label="Total Households"
                required
              />
              <StyledInput
                type="number"
                value={formik.values.totalHouseHolds}
                onChange={formik.handleChange("totalHouseHolds")}
                onBlur={formik.handleBlur("totalHouseHolds")}
                placeholder="0"
                error={
                  formik.touched.totalHouseHolds &&
                  Boolean(formik.errors.totalHouseHolds)
                }
              />
              {formik.touched.totalHouseHolds &&
                formik.errors.totalHouseHolds && (
                  <FormHelperText>
                    {formik.errors.totalHouseHolds}
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>

          {/* Total People */}
          <Grid item xs={12} md={4}>
            <FormControl
              fullWidth
              error={
                formik.touched.totalPeople && Boolean(formik.errors.totalPeople)
              }
            >
              <FieldLabel
                icon={PeopleAltOutlinedIcon}
                label="Total People"
                required
              />
              <StyledInput
                type="number"
                value={formik.values.totalPeople}
                onChange={formik.handleChange("totalPeople")}
                onBlur={formik.handleBlur("totalPeople")}
                placeholder="0"
                error={
                  formik.touched.totalPeople &&
                  Boolean(formik.errors.totalPeople)
                }
              />
              {formik.touched.totalPeople && formik.errors.totalPeople && (
                <FormHelperText>{formik.errors.totalPeople}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Household Radius */}
          <Grid item xs={12} md={6}>
            <FormControl
              fullWidth
              error={
                formik.touched.houseHoldRadius &&
                Boolean(formik.errors.houseHoldRadius)
              }
            >
              <FieldLabel
                icon={RadarOutlinedIcon}
                label="Household Radius (km)"
                required
              />
              <StyledInput
                type="number"
                value={formik.values.houseHoldRadius}
                onChange={formik.handleChange("houseHoldRadius")}
                onBlur={formik.handleBlur("houseHoldRadius")}
                placeholder="0"
                error={
                  formik.touched.houseHoldRadius &&
                  Boolean(formik.errors.houseHoldRadius)
                }
              />
              {formik.touched.houseHoldRadius &&
                formik.errors.houseHoldRadius && (
                  <FormHelperText>
                    {formik.errors.houseHoldRadius}
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>

          {/* Road Access */}
          <Grid item xs={12} md={6}>
            <FieldLabel icon={RouteOutlinedIcon} label="Road Access" />
            <Box
              sx={{
                border: "1.5px solid #e5e7eb",
                borderRadius: "10px",
                px: 1.75,
                py: 1.1,
                background: "#ffffff",
                minHeight: 46,
                display: "flex",
                alignItems: "center",
              }}
            >
              <RadioGroup
                row
                value={formik.values.roadAccess}
                onChange={(e) =>
                  formik.setFieldValue("roadAccess", e.target.value)
                }
                sx={{ gap: 1 }}
              >
                {["Yes", "No"].map((opt) => (
                  <FormControlLabel
                    key={opt}
                    value={opt}
                    control={
                      <Radio
                        size="small"
                        sx={{
                          color: "#d1d5db",
                          "&.Mui-checked": { color: "#16a34a" },
                          p: 0.5,
                        }}
                      />
                    }
                    label={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.86rem",
                            fontWeight: 500,
                            color:
                              formik.values.roadAccess === opt
                                ? opt === "Yes"
                                  ? "#16a34a"
                                  : "#ef4444"
                                : "#6b7280",
                          }}
                        >
                          {opt}
                        </Typography>
                      </Box>
                    }
                    sx={{ mr: 1, ml: 0 }}
                  />
                ))}
              </RadioGroup>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      {/* ── Footer ── */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: 2.5,
          background: "#fff",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "flex-end",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <Button
          onClick={onClose}
          disabled={formik.isSubmitting}
          sx={{
            color: "#6b7280",
            fontWeight: 500,
            fontSize: "0.85rem",
            borderRadius: "9px",
            px: 3,
            py: 1,
            textTransform: "none",
            border: "1.5px solid #e5e7eb",
            "&:hover": {
              background: "#f9fafb",
              borderColor: "#d1d5db",
            },
          }}
        >
          Cancel
        </Button>
        {/* <Button variant="outlined" onClick={formik.handleReset} color="error">
          Reset
        </Button> */}
        <Button
          variant="contained"
          onClick={formik.handleSubmit}
          disabled={formik.isSubmitting}
          disableElevation
          startIcon={
            formik.isSubmitting ? (
              <CircularProgress
                size={14}
                sx={{ color: "rgba(255,255,255,0.7)" }}
              />
            ) : null
          }
          sx={{
            background: "linear-gradient(135deg, #166534, #16a34a)",
            borderRadius: "9px",
            px: 3.5,
            py: 1,
            fontWeight: 600,
            fontSize: "0.85rem",
            textTransform: "none",
            letterSpacing: "0.01em",
            color: "#fff",
            transition: "all 0.2s ease",
            "&:hover": {
              background: "linear-gradient(135deg, #14532d, #15803d)",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
            "&.Mui-disabled": {
              background: "#d1d5db",
              color: "#9ca3af",
            },
          }}
        >
          {formik.isSubmitting
            ? "Saving..."
            : isEdit
              ? "Update"
              : "Create"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default CreateTrainingSiteDialog;
