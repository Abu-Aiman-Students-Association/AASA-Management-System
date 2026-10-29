import AdminDashboard from "./AdminDashboard";
import VerifyMemberCard from "./VerifyMemberCard";
import "./admin.css";
export default function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("verify")) return <VerifyMemberCard token={params.get("verify") || ""} />;
  return <AdminDashboard />;
}
