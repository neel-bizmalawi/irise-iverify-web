import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material"
import Breadcrumb from "../../components/Breadcrumb"
import AppPagination from "../../components/AppPagination"
import AppTable from "../../components/AppTable"
import AppTableFilter from "../../components/AppTableFilter"
import CreateCustomerDialog from "./CreateCustomerDialog"
import axios from "axios"
import { toast } from "react-toastify"
import ExportButtons from "../../components/ExportButtons"
import { API_BASE_URL } from "../../config"
import { Pencil, RefreshCw, UserCheck, UserX } from "lucide-react"

const isApiTrue = (value) => {
  if (value === true) return true
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    return ["true", "1", "yes"].includes(value.toLowerCase().trim())
  }
  return false
}

const toCount = (value) => {
  const count = Number(value)
  return Number.isFinite(count) ? count : 0
}

const canUpdateBeneficiaries = (item) => {
  const explicitFlag =
    item.can_update_beneficiaries ?? item.canUpdateBeneficiaries

  if (explicitFlag !== undefined && explicitFlag !== null) {
    return isApiTrue(explicitFlag)
  }

  return (
    toCount(
      item.remaining_beneficiary_count ?? item.remainingBeneficiaryCount,
    ) > 0 ||
    toCount(item.excess_beneficiary_count ?? item.excessBeneficiaryCount) > 0
  )
}

const actionIconSx = {
  width: 34,
  height: 34,
  border: "1px solid #d1d5db",
  color: "#374151",
  background: "#ffffff",
  "&:hover": {
    background: "#f8fafc",
    borderColor: "#9ca3af",
  },
  "&.Mui-disabled": {
    color: "#cbd5e1",
    borderColor: "#e5e7eb",
    background: "#f8fafc",
  },
}

const Customers = () => {
  const [tableData, setTableData] = useState([])
  const [filterFields, setFilterFields] = useState([])
  const [activeFilters, setActiveFilters] = useState([])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState(null)
  const [beneficiaryUpdateCustomerId, setBeneficiaryUpdateCustomerId] =
    useState(null)
  const [updatingBeneficiaries, setUpdatingBeneficiaries] = useState(false)

  const [createOptions, setCreateOptions] = useState([])
  const [modifiedByOptions, setModifiedByOptions] = useState([])

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/customer/getAllCustomers`)
      setCreateOptions(res.data?.data || [])
      setModifiedByOptions(res.data?.data || [])
    } catch (error) {
      console.error("fetchUsers error:", error)
    }
  }

  // ── Table Columns ────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      { key: "adminID", label: "customer ID", align: "center" },
      { key: "name", label: "Name" },
      { key: "userName", label: "Username" },
      { key: "email", label: "Email", align: "center" },
      {
        key: "contactNo",
        label: "Contact No.",
        align: "center",
        render: (v) => v ?? "-",
      },
      {
        key: "beneficiaryCount",
        label: "Beneficiary Count",
        align: "center",
        render: (v) => v ?? "-",
      },
      {
        key: "timezone",
        label: "Timezone",
        align: "center",
        render: (v) => v ?? "-",
      },
      {
        key: "status",
        label: "Status",
        align: "center",
        render: (value) => (
          <Chip
            label={value ? value.charAt(0).toUpperCase() + value.slice(1) : "-"}
            size="small"
            color={value === "active" ? "success" : "error"}
          />
        ),
      },
      //  {
      //   key: "status",
      //   label: "Status",
      //   align: "center",
      //   render: (value) => (
      //     <span
      //       style={{
      //         color: value === "active" ? "green" : "red",
      //         fontWeight: 600,
      //       }}
      //     >
      //       {value || "-"}
      //     </span>
      //   ),
      // },
      { key: "created_by_name", label: "Created By", align: "center" },
      { key: "modified_by_name", label: "Modified By", align: "center" },
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
        width: 180,
        render: (_, row) => {
          const isInactive = row.status?.toLowerCase().trim() === "inactive"

          return (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "nowrap",
                minWidth: 150,
              }}
            >
              <Tooltip title="Update Beneficiary" arrow>
                <span>
                  <IconButton
                    size="small"
                    aria-label="Update Beneficiary"
                    disabled={!row.can_update_beneficiaries}
                    onClick={() => handleOpenBeneficiaryUpdate(row.adminID)}
                    sx={actionIconSx}
                  >
                    <RefreshCw size={16} />
                  </IconButton>
                </span>
              </Tooltip>

              {!isInactive ? (
                <>
                  <Tooltip title="Edit" arrow>
                    <IconButton
                      size="small"
                      aria-label="Edit"
                      onClick={() => handleEdit(row.adminID)}
                      sx={actionIconSx}
                    >
                      <Pencil size={16} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Inactive" arrow>
                    <IconButton
                      size="small"
                      aria-label="Inactive"
                      color="error"
                      onClick={() => handleDeactivate(row.adminID)}
                      sx={{
                        ...actionIconSx,
                        color: "#dc2626",
                        borderColor: "#fecaca",
                        "&:hover": {
                          background: "#fef2f2",
                          borderColor: "#fca5a5",
                        },
                      }}
                  >
                    <UserX size={16} />
                  </IconButton>
                </Tooltip>
                </>
              ) : (
                <Tooltip title="Active" arrow>
                  <IconButton
                    size="small"
                    aria-label="Active"
                    onClick={() => handleActivate(row.adminID)}
                    sx={{
                      ...actionIconSx,
                      color: "#16a34a",
                      borderColor: "#bbf7d0",
                      "&:hover": {
                        background: "#f0fdf4",
                        borderColor: "#86efac",
                      },
                    }}
                  >
                    <UserCheck size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )
        },
      },
    ],
    [],
  )

  // ── Filter Fields ────────────────────────────────────────────────────────────
  useEffect(() => {
    setFilterFields([
      { key: "name", label: "Name", type: "text" },
      { key: "userName", label: "Username", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "mobile_no", label: "Contact No", type: "text" },
      { key: "timezone", label: "Timezone", type: "text" },
      { key: "beneficiary_count", label: "Beneficiary Count", type: "number" },
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
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["active", "inactive"],
      },
    ])
  }, [createOptions, modifiedByOptions])

  useEffect(() => {
    fetchUsers()
  }, [])

  // ── Fetch Table Data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (pageNum, limitNum, filters = []) => {
      try {
        setLoading(true)
        const cleanFilters =
          Array.isArray(filters) && filters.length > 0
            ? filters.map(({ field, operator, value }) => ({
                field,
                operator,
                value,
              }))
            : []

        const res = await axios.post(
          `${API_BASE_URL}/customer/list`,
          { filters: cleanFilters },
          { params: { page: pageNum, limit: limitNum } },
        )

        const response = res.data

        if (!response.data || !Array.isArray(response.data)) {
          setTableData([])
          setTotalItems(0)
          setTotalPages(0)
          return
        }

        const mappedData = response.data.map((item) => ({
          id: item.customerID ?? item.customer_id ?? item.adminID ?? item.id,
          adminID:
            item.customerID ?? item.customer_id ?? item.adminID ?? item.id,
          name: item.name ?? item.customer_name,
          email: item.email,
          userName: item.user_name ?? item.userName ?? item.username,
          roleName: item.role ?? item.roleName ?? "-",
          contactNo:
            item.mobile_number ?? item.mobile_no ?? item.contactNo ?? null,
          beneficiaryCount:
            item.beneficiary_count ?? item.beneficiaryCount ?? null,
          assignedBeneficiaryCount:
            item.assigned_beneficiary_count ??
            item.assignedBeneficiaryCount ??
            null,
          remainingBeneficiaryCount:
            item.remaining_beneficiary_count ??
            item.remainingBeneficiaryCount ??
            null,
          excessBeneficiaryCount:
            item.excess_beneficiary_count ??
            item.excessBeneficiaryCount ??
            null,
          can_update_beneficiaries: canUpdateBeneficiaries(item),
          timezone: item.timezone ?? null,
          status: item.status,
          created_by_name: item.created_by_name,
          modified_by_name: item.modified_by_name,
          created_date: item.created_date ?? null,
          modified_date: item.modified_date ?? null,
        }))

        setTableData(mappedData)
        setTotalItems(response.totalRecords || 0)
        setTotalPages(response.totalPages || 0)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load customers")
      } finally {
        setLoading(false)
      }
    },
    [columns],
  )

  useEffect(() => {
    fetchData(page, pageSize, activeFilters)
  }, [page, pageSize, activeFilters, fetchData])

  // ── Filter Handlers ──────────────────────────────────────────────────────────
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setActiveFilters([])
    setPage(1)
  }

  // ── Create / Update ──────────────────────────────────────────────────────────
  const handleSubmitCustomer = async (formData) => {
    const payload = {
      name: formData.name,
      user_name: formData.userName,
      email: formData.email,
      ...(formData.password ? { password: formData.password } : {}),
      mobile_number: formData.contactNo,
      role: "customer",
      beneficiary_count: Number(formData.beneficiaryCount),
      status: formData.status,
      timezone: formData.timezone,
    }
    console.log("📤 Payload being sent:", JSON.stringify(payload, null, 2))
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
      if (editId) {
        await axios.put(
          `${API_BASE_URL}/customer/update_customer/${editId}`,
          payload,
          config,
        )
        toast.success("Customer updated successfully!")
      } else {
        await axios.post(
          `${API_BASE_URL}/customer/create_customer`,
          payload,
          config,
        )
        toast.success("Customer created successfully!")
      }
      setPage(1)
      await fetchData(1, pageSize, activeFilters)
      setOpenDialog(false)
      setEditId(null)
      setEditData(null)
    } catch (error) {
      if (!error?.response) {
        toast.error("No internet connection.")
        return
      }
      const errData = error?.response?.data
      const messages = Array.isArray(errData?.message)
        ? errData.message
        : [errData?.message || "Unknown error"]
      console.error("Validation errors from server:", messages)
      toast.error(messages.join(" | "))
    } finally {
      setLoading(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = async (id) => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE_URL}/customer/get_customer/${id}`)
      const items = res.data?.data

      if (!items || items.length === 0) {
        toast.error("Customer not found")
        return
      }
      const item = items[0]

      setEditData({
        name: item.name ?? item.customer_name ?? "",
        userName: item.user_name ?? item.userName ?? item.username ?? "",
        email: item.email ?? "",
        password: "",
        contactNo: item.mobile_number ?? item.mobile_no ?? item.contactNo ?? "",
        role: "customer",
        beneficiaryCount: item.beneficiary_count ?? item.beneficiaryCount ?? "",
        status: item.status ?? "active",
        timezone: item.timezone ?? "",
      })

      setEditId(id)
      setOpenDialog(true)
    } catch (error) {
      console.error("Get by ID error:", error)
      toast.error("Failed to fetch customer")
    } finally {
      setLoading(false)
    }
  }

  // ── Show confirmation dialog instead of deleting directly ─────────────────

  const handleDeactivate = async (id) => {
    try {
      const token = localStorage.getItem("token")

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }

      await axios.put(
        `${API_BASE_URL}/customer/update_customer/${id}`,
        { status: "inactive" },
        config,
      )

      toast.success("Customer deactivated successfully!")
      await fetchData(page, pageSize, activeFilters)
    } catch {
      toast.error("Failed to deactivate customer")
    }
  }

  const handleActivate = async (id) => {
    try {
      const token = localStorage.getItem("token")

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }

      await axios.put(
        `${API_BASE_URL}/customer/update_customer/${id}`,
        {
          status: "active",
        },
        config,
      )

      toast.success("Customer activated successfully!")
      await fetchData(page, pageSize, activeFilters)
    } catch {
      toast.error("Failed to activate customer")
    }
  }

  const handleOpenBeneficiaryUpdate = (customerId) => {
    setBeneficiaryUpdateCustomerId(customerId)
  }

  const handleCloseBeneficiaryUpdate = () => {
    if (!updatingBeneficiaries) {
      setBeneficiaryUpdateCustomerId(null)
    }
  }

  const handleConfirmBeneficiaryUpdate = async () => {
    if (!beneficiaryUpdateCustomerId) return

    try {
      setUpdatingBeneficiaries(true)
      const token = localStorage.getItem("token")
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }

      const res = await axios.post(
        `${API_BASE_URL}/customer/update-beneficiaries/${beneficiaryUpdateCustomerId}`,
        {},
        config,
      )
      const response = res.data || {}

      if (response.message) {
        toast.success(response.message)
      }
      if (Number(response.assignedNow) > 0) {
        toast.success(`${response.assignedNow} beneficiaries assigned`)
      }
      if (Number(response.unassignedNow) > 0) {
        toast.success(`${response.unassignedNow} beneficiaries unassigned`)
      }

      setBeneficiaryUpdateCustomerId(null)
      await fetchData(page, pageSize, activeFilters)
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Failed to update beneficiary assignments"
      toast.error(Array.isArray(message) ? message.join(" | ") : message)
    } finally {
      setUpdatingBeneficiaries(false)
    }
  }

  const fetchAllForExport = async () => {
    const cleanFilters =
      Array.isArray(activeFilters) && activeFilters.length > 0
        ? activeFilters.map(({ field, operator, value }) => ({
            field,
            operator,
            value,
          }))
        : []
    const res = await axios.post(
      `${API_BASE_URL}/customer/list`,
      { filters: cleanFilters },
      { params: { page: 1, limit: 100000 } },
    )
    return res.data?.data ?? []
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Box>
      <h1 style={{ margin: 0 }}>Customers List</h1>
      <Breadcrumb
        homeLabel="Dashboard"
        items={[{ label: "Customers List", path: "/customers" }]}
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
            fileName="Customers"
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
          emptyText="No customers found"
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
          setPageSize(newSize)
          setPage(1)
        }}
      />

      {/* Dialog */}
      <CreateCustomerDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false)
          setEditId(null)
          setEditData(null)
        }}
        onSubmit={handleSubmitCustomer}
        initialData={editData}
      />

      <Dialog
        open={Boolean(beneficiaryUpdateCustomerId)}
        onClose={handleCloseBeneficiaryUpdate}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "14px",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem", pb: 0 }}>
          Update Beneficiary
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Update beneficiary assignments for this customer?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCloseBeneficiaryUpdate}
            disabled={updatingBeneficiaries}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmBeneficiaryUpdate}
            disabled={updatingBeneficiaries}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
              background: "#16a34a",
              boxShadow: "none",
              "&:hover": { background: "#15803d", boxShadow: "none" },
            }}
          >
            {updatingBeneficiaries ? "Updating..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Customers
