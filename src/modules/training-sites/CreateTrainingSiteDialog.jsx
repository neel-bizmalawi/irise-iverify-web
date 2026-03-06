import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Box,
  Typography,
  Divider,
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
import axios from "axios";

// Icons (using MUI icons - make sure @mui/icons-material is installed)
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import RadarOutlinedIcon from "@mui/icons-material/RadarOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ForestOutlinedIcon from "@mui/icons-material/ForestOutlined";
import { API_BASE_URL } from "../../../config";
import SearchableCreatableSelect from "../../components/SearchableCreatableSelect";

const initialState = {
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

// Styled field label
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

// Styled text input
const StyledInput = ({ value, onChange, type = "text", placeholder }) => (
  <InputBase
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    fullWidth

    sx={{
      border: "1.5px solid #e5e7eb",
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
        borderColor: "#9ca3af",
        background: "#fafafa",
      },
      "&.Mui-focused": {
        borderColor: "#16a34a",
        background: "#fff",
        boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.1)",
      },
    }}
  />
);

// Styled select
const StyledSelect = ({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  valueKey,
  labelKey,
}) => (
  <Select
    value={value || ""}
    onChange={onChange}
    disabled={disabled}
    displayEmpty
    fullWidth
    sx={{
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      px: 1.75,
      py: 0.1, // important
      fontSize: "0.88rem",
      color: value ? "#111827" : "#b0b7c3",
      background: "#ffffff",
      transition: "all 0.2s ease",

      "& .MuiOutlinedInput-notchedOutline": {
        border: "none",
      },

      "& .MuiSelect-select": {
        px: 0,
        py: 1.1, // 👈 match StyledInput vertical padding
        display: "flex",
        alignItems: "center",
      },

      "&:hover": {
        borderColor: "#9ca3af",
        background: "#fafafa",
      },

      "&.Mui-focused": {
        borderColor: "#16a34a",
        background: "#fff",
        boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.1)",
      },
    }}
  >
    <MenuItem value="" disabled>
      <Typography sx={{ fontSize: "0.85rem", color: "#b0b7c3" }}>
        {placeholder}
      </Typography>
    </MenuItem>

    {options.map((option) => (
      <MenuItem
        key={option[valueKey]}
        value={option[labelKey]}
        sx={{ fontSize: "0.88rem" }}
      >
        {option[labelKey]}
      </MenuItem>
    ))}
  </Select>
);

const CreateTrainingSiteDialog = ({ open, onClose, onSubmit, initialData }) => {
  const [form, setForm] = useState(initialState);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [authorityOptions, setAuthorityOptions] = useState([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [authorityLoading, setAuthorityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // const [districtSearch, setDistrictSearch] = useState("");

  console.log("district options are", districtOptions)

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setForm({ ...initialState, ...initialData });
    } else {
      setForm(initialState);
    }
  }, [initialData, open]);

  

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit?.(form);
      setForm(initialState);
    } finally {
      setSubmitting(false);
    }
  };

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
        { params: { search: query } }
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
        { params: { search: query } }
      );

      setAuthorityOptions(res.data?.data || []);
    } catch (error) {
      console.error("District search error:", error);
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
        }

      );

      const newDistrict = res.data.data;

      setDistrictOptions((prev) => [...prev, newDistrict]);

      setForm((prev) => ({
        ...prev,
        district: newDistrict,
      }));
    } catch (error) {
      console.error("Add district error:", error);
    }
  };


  // const sectionDivider = (label) => (
  //   <Grid item xs={12}>
  //     <Box
  //       sx={{
  //         display: "flex",
  //         alignItems: "center",
  //         gap: 1.5,
  //         mt: 0.5,
  //         mb: -1,
  //       }}
  //     >
  //       <Typography
  //         variant="caption"
  //         sx={{
  //           fontWeight: 700,
  //           color: "#16a34a",
  //           letterSpacing: "0.06em",
  //           textTransform: "uppercase",
  //           fontSize: "0.65rem",
  //           whiteSpace: "nowrap",
  //         }}
  //       >
  //         {label}
  //       </Typography>
  //       <Box
  //         sx={{
  //           flex: 1,
  //           height: "1px",
  //           background: "linear-gradient(to right, #dcfce7, transparent)",
  //         }}
  //       />
  //     </Box>
  //   </Grid>
  // );






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
      {/* Header */}
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
        {/* Decorative circles */}
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

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.75 }}>
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
        </Box>

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

      {/* Form Body */}
      <DialogContent
        sx={{ px: { xs: 2.5, sm: 4 }, py: 3.5, background: "#f8fafc" }}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FieldLabel
                icon={LocationOnOutlinedIcon}
                label="Training Site Name"
                required
              />
              <StyledInput
                value={form.trainingSiteName}
                onChange={handleChange("trainingSiteName")}
                placeholder="e.g. Lilongwe North Site"
              />
            </FormControl>
          </Grid>

          {/* <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FieldLabel
                icon={LocationOnOutlinedIcon}
                label="District"
                required
              />

              <TextField
                placeholder="Search District..."
                size="small"
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                sx={{ mb: 1 }}
              />

              <StyledSelect
                value={form.district}
                onChange={handleChange("district")}
                // options={districtOptions}
                options={filteredDistricts}
                disabled={districtLoading}
                placeholder="Select District"
                valueKey="district_id"
                labelKey="district_name"
              />
              {districtSearch && !districtExists && (
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => createDistrict(districtSearch)}
                >
                  + Add "{districtSearch}"
                </Button>
              )}

            </FormControl>
          </Grid> */}

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FieldLabel
                icon={LocationOnOutlinedIcon}
                label="District"
                required
              />

              <SearchableCreatableSelect
                label="Search District"
                value={form.district}
                options={districtOptions}
                loading={districtLoading}
                labelKey="district_name"
                onSearch={searchDistrict}
                onChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    district: val?.district_name,
                  }))
                }
                onCreate={createDistrict}
                allowCreate={true}

              />
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FieldLabel
                icon={AccountBalanceOutlinedIcon}
                label="Traditional Authority"
              />
              {/* <StyledSelect
                value={form.traditionalAuthority}
                onChange={handleChange("traditionalAuthority")}
                options={authorityOptions}
                disabled={authorityLoading}
                placeholder="Select Authority"
                valueKey="authority_id"
                labelKey="authority_name"
              /> */}

              <SearchableCreatableSelect
                label="Search Authority"
                value={form.traditionalAuthority}
                options={authorityOptions}
                loading={authorityLoading}
                labelKey="authority_name"
                onSearch={searchAuthority}
                onChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    traditionalAuthority: val?.authority_name,
                  }))
                }
                onCreate={createDistrict}
                allowCreate={false}

              />
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FieldLabel
                icon={PersonOutlineOutlinedIcon}
                label="Group Village Head"
              />
              <StyledInput
                value={form.groupVillageHead}
                onChange={handleChange("groupVillageHead")}
                placeholder="e.g. GVH Mwale"
              />
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FieldLabel
                icon={PersonOutlineOutlinedIcon}
                label="Village Head Name"
              />
              <StyledInput
                value={form.villageHeadName}
                onChange={handleChange("villageHeadName")}
                placeholder="Full name"
              />
            </FormControl>
          </Grid>

          {/* ── Statistics ── */}

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <FieldLabel
                icon={LocalFireDepartmentOutlinedIcon}
                label="Total Cookstoves"
              />
              <StyledInput
                type="number"
                value={form.totalCookstoves}
                onChange={handleChange("totalCookstoves")}
                placeholder="0"
              />
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <FieldLabel icon={HomeOutlinedIcon} label="Total Households" />
              <StyledInput
                type="number"
                value={form.totalHouseHolds}
                onChange={handleChange("totalHouseHolds")}
                placeholder="0"
              />
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <FieldLabel icon={PeopleAltOutlinedIcon} label="Total People" />
              <StyledInput
                type="number"
                value={form.totalPeople}
                onChange={handleChange("totalPeople")}
                placeholder="0"
              />
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FieldLabel
                icon={RadarOutlinedIcon}
                label="Household Radius (km)"
              />
              <StyledInput
                type="number"
                value={form.houseHoldRadius}
                onChange={handleChange("houseHoldRadius")}
                placeholder="e.g. 2.5"
              />
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
                py: 1.1, // 👈 match StyledInput
                background: "#ffffff",
                minHeight: 46, // 👈 ensures same height
                display: "flex",
                alignItems: "center",
              }}
            >
              <RadioGroup
                row
                value={form.roadAccess}
                onChange={handleChange("roadAccess")}
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
                              form.roadAccess === opt
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

      {/* Footer */}
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
          disabled={submitting}
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
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          disableElevation
          startIcon={
            submitting ? (
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
          {submitting ? "Saving..." : isEdit ? "Update Site" : "Create Site"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default CreateTrainingSiteDialog;











