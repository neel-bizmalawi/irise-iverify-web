import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Box, Button, CircularProgress, Chip } from "@mui/material"
import Breadcrumb from "../../components/Breadcrumb"
import AppPagination from "../../components/AppPagination"
import AppTable from "../../components/AppTable"
import AppTableFilter from "../../components/AppTableFilter"
import CreateCustomerDialog from "./CreateCustomerDialog"
import axios from "axios"
import { toast } from "react-toastify"
import ExportButtons from "../../components/ExportButtons"
import { API_BASE_URL } from "../../config"

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
        render: (_, row) => {
          const isInactive = row.status?.toLowerCase().trim() === "inactive"

          return (
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
              {!isInactive ? (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleEdit(row.adminID)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleDeactivate(row.adminID)}
                  >
                    Inactive
                  </Button>
                </>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => handleActivate(row.adminID)}
                >
                  Active
                </Button>
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
    </Box>
  )
}

export default Customers
