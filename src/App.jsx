import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./app-layout/AppLayout";
import Dashboard from "./modules/dashboard/Dashboard";
import TrainingSites from "./modules/training-sites/TrainingSites";
import Beneficiary from "./modules/beneficiary/Beneficiary";
import Users from "./modules/users/Users";
import Login from "./modules/auth/Login";
import { ToastContainer } from "react-toastify";
// import CustomerDashboard from "./modules/dashboard/CustomerDashboard";
// import Monitoring from "./modules/Monitoring/Monitoring";
// import AuditProcess from "./modules/Aduit-Process/Auditprocess";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected - AppLayout handles auth check */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/training" element={<TrainingSites />} />
          <Route path="/beneficiary" element={<Beneficiary />} />
          <Route path="/users" element={<Users />} />
          {/* <Route path="/monitoring" element={<Monitoring />} /> */}
          {/* <Route path="/auditprocess" element={<AuditProcess />} /> */}
          {/* <Route path="/dashboard" element={<CustomerDashboard />} /> */}
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </BrowserRouter>
  );
}

export default App;
