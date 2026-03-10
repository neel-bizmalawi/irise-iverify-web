import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Popover,
  IconButton,
  Divider,
  Select,
  MenuItem,
  TextField,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
  Drawer,
  Autocomplete,
} from "@mui/material";
import { SlidersHorizontal, X, Plus, Trash2, Filter } from "lucide-react";
const OPERATORS = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
    { value: "isEmpty", label: "Empty" },
    { value: "is_not_empty", label: "Not Empty" },
  ],
  searchable: [
    { value: "equals", label: "Equals" },
    { value: "isEmpty", label: "Empty" },
    { value: "is_not_empty", label: "Not Empty" },
  ],

  select: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Is not" },
  ],
  date: [
    { value: "equals", label: "Equals" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "gt", label: "Greater than" },
    { value: "lt", label: "Less than" },
    { value: "gte", label: "Greater than or equal" },
    { value: "lte", label: "Less than or equal" },
    // { value: "isEmpty", label: "Empty" },
    // { value: "is_not_empty", label: "Not Empty" },
  ],
};

const NO_VALUE_OPERATORS = ["isEmpty", "is_not_empty"];

const FIELD_MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: 220,
    },
  },
  anchorOrigin: {
    vertical: "bottom",
    horizontal: "left",
  },
  transformOrigin: {
    vertical: "top",
    horizontal: "left",
  },
};

// const buildEmptyRule = (fields, usedKeys = []) => {
//   const firstAvailable = fields.find((f) => !usedKeys.includes(f.key));
//   return {
//     id: Date.now() + Math.random(),
//     field: firstAvailable?.key || "",
//     operator: "",
//     value: "",
//   };
// };

const buildEmptyRule = (fields, usedKeys = []) => {
  const firstAvailable = fields.find((f) => !usedKeys.includes(f.key));
  const ops = OPERATORS[firstAvailable?.type || "text"] || OPERATORS.text;
  return {
    id: Date.now() + Math.random(),
    field: firstAvailable?.key || "",
    operator: ops[0]?.value || "", // ← KEY FIX
    value: "",
  };
};

const inputSx = {
  minWidth: 130,
  "& .MuiOutlinedInput-root": {
    fontSize: 13,
    borderRadius: "8px",
    background: "#f8fafc",
    "& fieldset": { borderColor: "#e2e8f0" },
    "&:hover fieldset": { borderColor: "#94a3b8" },
    "&.Mui-focused fieldset": { borderColor: "#2563eb", borderWidth: 1.5 },
  },
};
const selectSx = {
  ...inputSx,
  "& .MuiSelect-select": { fontSize: 13 },
};
const ValueInput = ({ field, value, onChange, fullWidth = false }) => {
  if (!field) return null;
  const sx = fullWidth
    ? { ...inputSx, minWidth: "unset", width: "100%" }
    : inputSx;
  if (field.type === "select" && field.options?.length) {
    return (
      <Select
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        sx={sx}
      >
        <MenuItem value="" disabled>
          <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>
            Select value
          </Typography>
        </MenuItem>
        {field.options.map((opt) => (
          <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    );
  }

  // if (field.type === "searchable") {
  //   return (
  //     <Autocomplete
  //       size="small"
  //       options={field.options || []}
  //       getOptionLabel={(option) =>
  //         typeof option === "string" ? option : option[field.labelKey] || ""
  //       }
  //       value={value || null}
  //       onInputChange={(event, newValue) => {
  //         field.onSearch?.(newValue);
  //       }}
  //       onChange={(event, newValue) => {
  //         onChange(newValue?.[field.labelKey] || "");
  //       }}
  //       renderInput={(params) => (
  //         <TextField {...params} placeholder={`Search ${field.label}`} />
  //       )}
  //       sx={{ minWidth: 200 }}
  //     />
  //   );
  // }
  if (field.type === "searchable") {
  // Deduplicate options by labelKey to avoid React duplicate key warnings
  const rawOptions = field.options || [];
  const seen = new Set();
  const dedupedOptions = rawOptions.filter((opt) => {
    const label = typeof opt === "string" ? opt : opt[field.labelKey] || "";
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });

  return (
    <Autocomplete
      size="small"
      options={dedupedOptions}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option[field.labelKey] || ""
      }
      value={value || null}
      onInputChange={(event, newValue) => {
        field.onSearch?.(newValue);
      }}
      onChange={(event, newValue) => {
        onChange(newValue?.[field.labelKey] || "");
      }}
      renderOption={(props, option) => {
        const label =
          typeof option === "string" ? option : option[field.labelKey] || "";
        const uniqueKey = option?.id ?? option?.training_site ?? label;
        return (
          <li {...props} key={uniqueKey}>
            {label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} placeholder={`Search ${field.label}`} />
      )}
      sx={{ minWidth: 200 }}
    />
  );
}

  if (field.type === "date") {
    return (
      <TextField
        size="small"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={sx}
        InputLabelProps={{ shrink: true }}
      />
    );
  }
  if (field.type === "number") {
    return (
      <TextField
        size="small"
        type="number"
        placeholder="Enter value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={sx}
      />
    );
  }
  return (
    <TextField
      size="small"
      placeholder="Enter value"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={sx}
    />
  );
};
const RuleRowDesktop = ({
  rule,
  idx,
  fields,
  availableFields,
  operators,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onRemove,
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      p: 1.5,
      borderRadius: "10px",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
    }}
  >
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        minWidth: 36,
      }}
    >
      {idx === 0 ? "Where" : "And"}
    </Typography>
    {/* <Select
      size="small"
      value={rule.field}
      onChange={(e) => onFieldChange(e.target.value)}
      sx={{ ...selectSx, minWidth: 130 }}
    > */}
    <Select
  size="small"
  value={rule.field}
  onChange={(e) => onFieldChange(e.target.value)}
  sx={{ ...selectSx, minWidth: 130 }}
  MenuProps={FIELD_MENU_PROPS}
>
      {availableFields.map((f) => (
        <MenuItem key={f.key} value={f.key} sx={{ fontSize: 13 }}>
          {f.label}
        </MenuItem>
      ))}
    </Select>
    <Select
      size="small"
      value={rule.operator || operators[0]?.value}
      onChange={(e) => onOperatorChange(e.target.value)}
      sx={{ ...selectSx, minWidth: 115 }}
    >
      {operators.map((op) => (
        <MenuItem key={op.value} value={op.value} sx={{ fontSize: 13 }}>
          {op.label}
        </MenuItem>
      ))}
    </Select>
    {!NO_VALUE_OPERATORS.includes(rule.operator) && (
      <ValueInput
        field={fields.find((f) => f.key === rule.field)}
        value={rule.value}
        onChange={onValueChange}
      />
    )}
    <Tooltip title="Remove">
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          color: "#94a3b8",
          ml: "auto",
          "&:hover": { color: "#ef4444", background: "#fef2f2" },
        }}
      >
        <Trash2 size={14} />
      </IconButton>
    </Tooltip>
  </Box>
);
const RuleRowMobile = ({
  rule,
  idx,
  fields,
  availableFields,
  operators,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onRemove,
}) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: "10px",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {idx === 0 ? "Where" : "And"}
      </Typography>
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          color: "#94a3b8",
          "&:hover": { color: "#ef4444", background: "#fef2f2" },
        }}
      >
        <Trash2 size={14} />
      </IconButton>
    </Box>
    {/* <Select
      size="small"
      value={rule.field}
      onChange={(e) => onFieldChange(e.target.value)}
      sx={{ ...selectSx, width: "100%", minWidth: "unset" }}
    > */}
    <Select
  size="small"
  value={rule.field}
  onChange={(e) => onFieldChange(e.target.value)}
  sx={{ ...selectSx, width: "100%", minWidth: "unset" }}
  MenuProps={FIELD_MENU_PROPS}
>
      {availableFields.map((f) => (
        <MenuItem key={f.key} value={f.key} sx={{ fontSize: 13 }}>
          {f.label}
        </MenuItem>
      ))}
    </Select>
    <Box sx={{ display: "flex", gap: 1 }}>
      <Select
        size="small"
        value={rule.operator || operators[0]?.value}
        onChange={(e) => onOperatorChange(e.target.value)}
        sx={{ ...selectSx, flex: "0 0 auto", minWidth: 100 }}
      >
        {operators.map((op) => (
          <MenuItem key={op.value} value={op.value} sx={{ fontSize: 13 }}>
            {op.label}
          </MenuItem>
        ))}
      </Select>
      {!NO_VALUE_OPERATORS.includes(rule.operator) && (
        <Box sx={{ flex: 1 }}>
          <ValueInput
            field={fields.find((f) => f.key === rule.field)}
            value={rule.value}
            onChange={onValueChange}
            fullWidth
          />
        </Box>
      )}
    </Box>
  </Box>
);
const FilterPanel = ({
  fields,
  draft,
  isMobile,
  allFieldsUsed,
  onAddRule,
  onRemoveRule,
  onRuleChange,
  onApply,
  onClear,
  onClose,
}) => {
  const getFieldDef = (key) => fields.find((f) => f.key === key);
  const usedKeys = draft.map((r) => r.field).filter(Boolean);
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Filter size={16} color="#2563eb" />
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            Filters
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8" }}>
          <X size={16} />
        </IconButton>
      </Box>
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          overflowY: "auto",
          maxHeight: { xs: "none", sm: 360 }, // desktop: cap at 360px and scroll; mobile: handled by Drawer
          flex: { xs: "1 1 0", sm: "unset" },
          minHeight: { xs: 0, sm: "unset" },
        }}
      >
        {draft.length === 0 && (
          <Typography
            sx={{ fontSize: 13, color: "#94a3b8", textAlign: "center", py: 2 }}
          >
            No filters added yet. Click "+ Add filter" to start.
          </Typography>
        )}
        {draft.map((rule, idx) => {
          const fieldDef = getFieldDef(rule.field);
          const operators =
            OPERATORS[fieldDef?.type || "text"] || OPERATORS.text;

          // Each rule's dropdown shows its OWN field + any fields not used by other rules
          const otherUsedKeys = usedKeys.filter((k) => k !== rule.field);
          const availableFields = fields.filter(
            (f) => !otherUsedKeys.includes(f.key),
          );
          const rowProps = {
            rule,
            idx,
            fields,
            availableFields,
            operators,
            onFieldChange: (val) => onRuleChange(rule.id, "field", val),
            onOperatorChange: (val) => onRuleChange(rule.id, "operator", val),
            onValueChange: (val) => onRuleChange(rule.id, "value", val),
            onRemove: () => onRemoveRule(rule.id),
          };

          return isMobile ? (
            <RuleRowMobile {...rowProps} key={rule.id} />
          ) : (
            <RuleRowDesktop {...rowProps} key={rule.id} />
          );
        })}
        {!allFieldsUsed ? (
          <Button
            onClick={onAddRule}
            startIcon={<Plus size={14} />}
            sx={{
              textTransform: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "#2563eb",
              justifyContent: "flex-start",
              pl: 0.5,
              "&:hover": { background: "transparent", opacity: 0.8 },
            }}
          >
            Add filter
          </Button>
        ) : (
          draft.length > 0 && (
            <Typography sx={{ fontSize: 12, color: "#94a3b8", pl: 0.5 }}>
              All columns have been filtered.
            </Typography>
          )
        )}
      </Box>

      <Divider sx={{ borderColor: "#e2e8f0" }} />
      <Box
        sx={{
          px: 2.5,
          py: 1.8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8fafc",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Button
          onClick={onClear}
          variant="text"
          sx={{
            textTransform: "none",
            fontSize: 13,
            color: "#64748b",
            fontWeight: 600,
            "&:hover": { color: "#ef4444", background: "transparent" },
          }}
        >
          Clear all
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "8px",
              borderColor: "#e2e8f0",
              color: "#475569",
              "&:hover": { borderColor: "#94a3b8" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onApply}
            variant="contained"
            sx={{
              textTransform: "none",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "8px",
              background: "#2563eb",
              boxShadow: "none",
              "&:hover": { background: "#1d4ed8", boxShadow: "none" },
            }}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
const AppTableFilter = ({
  fields = [],
  value = [],
  onChange,
  onApply,
  onClear,
  buttonLabel = "Filter",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  //const activeCount = value.filter((r) => r.field && r.value).length;
  const activeCount = value.filter((r) => {
    if (!r.field) return false;
    if (NO_VALUE_OPERATORS.includes(r.operator)) return true;
    return r.value !== "" && r.value !== null && r.value !== undefined;
  }).length;

  const usedKeys = draft.map((r) => r.field).filter(Boolean);
  const allFieldsUsed = usedKeys.length >= fields.length;
  const handleOpen = () => {
    setDraft(value.length ? [...value] : [buildEmptyRule(fields)]);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);
  const handleAddRule = () => {
    if (allFieldsUsed) return;
    setDraft((prev) => {
      const currentUsed = prev.map((r) => r.field).filter(Boolean);
      return [...prev, buildEmptyRule(fields, currentUsed)];
    });
  };
  const handleRemoveRule = (id) =>
    setDraft((prev) => prev.filter((r) => r.id !== id));
  const handleRuleChange = (id, key, val) => {
    setDraft((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [key]: val };
        if (key === "field") {
          const fieldDef = fields.find((f) => f.key === val);
          const ops = OPERATORS[fieldDef?.type || "text"];
          updated.operator = ops[0]?.value || "";
          updated.value = "";
        }
        return updated;
      }),
    );
  };

  // const handleApply = () => {
  //   const valid = draft.filter((r) => r.field && r.value);
  //   onChange?.(valid);
  //   onApply?.(valid);
  //   setOpen(false);
  // };

  const handleApply = () => {
    const valid = draft.filter((r) => {
      if (!r.field) return false;

      // operators that don't need value
      if (["isEmpty", "is_not_empty"].includes(r.operator)) {
        return true;
      }

      return r.value !== "" && r.value !== null && r.value !== undefined;
    });

    onChange?.(valid);
    onApply?.(valid);
    setOpen(false);
  };

  const handleClear = () => {
    setDraft([buildEmptyRule(fields)]);
    onChange?.([]);
    onClear?.();
    setOpen(false);
  };
  const getFieldDef = (key) => fields.find((f) => f.key === key);
  const panelProps = {
    fields,
    draft,
    isMobile,
    allFieldsUsed,
    onAddRule: handleAddRule,
    onRemoveRule: handleRemoveRule,
    onRuleChange: handleRuleChange,
    onApply: handleApply,
    onClear: handleClear,
    onClose: handleClose,
  };
  return (
    <>
      <Box
        ref={anchorRef}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Button
          onClick={handleOpen}
          variant="outlined"
          startIcon={<SlidersHorizontal size={15} />}
          sx={{
            textTransform: "none",
            fontSize: 13,
            fontWeight: 600,
            color: activeCount > 0 ? "#2563eb" : "#475569",
            borderColor: activeCount > 0 ? "#2563eb" : "#e2e8f0",
            borderRadius: "8px",
            px: 1.8,
            py: 0.75,
            background: activeCount > 0 ? "#eff6ff" : "#fff",
            "&:hover": {
              borderColor: "#2563eb",
              background: "#eff6ff",
              color: "#2563eb",
            },
          }}
        >
          {buttonLabel}
          {activeCount > 0 && (
            <Box
              sx={{
                ml: 1,
                px: 0.8,
                py: 0.1,
                borderRadius: "10px",
                background: "#2563eb",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: "18px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {activeCount}
            </Box>
          )}
        </Button>
        {!isMobile &&
          // value
          //   .filter((r) => r.field && r.value)
          //   .map((r) => {
          value
            .filter((r) => {
              if (!r.field) return false;
              if (NO_VALUE_OPERATORS.includes(r.operator)) return true;
              return (
                r.value !== "" && r.value !== null && r.value !== undefined
              );
            })
            .map((r) => {
              const fieldDef = getFieldDef(r.field);
              return (
                <Chip
                  key={r.id}
                  label={
                    <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                      <b>{fieldDef?.label || r.field}</b>{" "}
                      <span style={{ color: "#64748b" }}>
                        {r.operator.replace(/_/g, " ")}
                      </span>{" "}
                      {/* <b>{r.value}</b> */}
                      {!NO_VALUE_OPERATORS.includes(r.operator) && <b>{r.value}</b>}
                    </Typography>
                  }
                  onDelete={() => {
                    const updated = value.filter((x) => x.id !== r.id);
                    onChange?.(updated);
                    onApply?.(updated);
                  }}
                  deleteIcon={<X size={12} />}
                  size="small"
                  sx={{
                    height: 28,
                    borderRadius: "6px",
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    color: "#0369a1",
                    "& .MuiChip-deleteIcon": { color: "#0369a1", ml: 0.4 },
                  }}
                />
              );
            })}
      </Box>
      {!isMobile && (
        <Popover
          open={open}
          anchorEl={anchorRef.current}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid #e2e8f0",
              minWidth: 520,
              maxWidth: 660,
              overflow: "hidden",
            },
          }}
        >
          <FilterPanel {...panelProps} />
        </Popover>
      )}
      {isMobile && (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              borderTopLeftRadius: "18px",
              borderTopRightRadius: "18px",
              maxHeight: "85vh",
              height: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              pt: 1.2,
              pb: 0.5,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "#cbd5e1",
              }}
            />
          </Box>
          <FilterPanel {...panelProps} />
        </Drawer>
      )}
    </>
  );
};

export default AppTableFilter;
