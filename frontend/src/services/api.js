import axios from "axios";

const TOKEN_KEY = "govproposal_token";

const API_URL =
  import.meta.env.VITE_API_URL || "https://govproposalai-3.onrender.com";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000,
});

// ✅ Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    console.error(`[API Error] ${message}`);

    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("govproposal_user");

      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/register")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

//
// ==================== AUTH ====================
//
export const loginUser = (data) => api.post("/api/auth/login", data);
export const registerUser = (data) => api.post("/api/auth/register", data);
export const getCurrentUser = () => api.get("/api/auth/me");

//
// ==================== COMPLIANCE ====================
//
export const getNAICSCodes = (category) =>
  api.get("/api/compliance/naics", { params: { category } });

export const getNAICSDetails = (code) =>
  api.get(`/api/compliance/naics/${code}`);

export const getComplianceRequirements = (category) =>
  api.get("/api/compliance/requirements", { params: { category } });

export const getComplianceRequirementDetails = (id) =>
  api.get(`/api/compliance/requirements/${id}`);

export const getContractVehicles = () =>
  api.get("/api/compliance/vehicles");

export const getContractVehicleDetails = (id) =>
  api.get(`/api/compliance/vehicles/${id}`);

export const getAgencies = () =>
  api.get("/api/compliance/agencies");

export const getCompanyCompliance = () =>
  api.get("/api/compliance/company");

export const updateCompanyProfile = (data) =>
  api.post("/api/compliance/company", data);

export const addCompanyNAICS = (naicsId, isPrimary) =>
  api.post("/api/compliance/company/naics", {
    naics_id: naicsId,
    is_primary: isPrimary,
  });

export const removeCompanyNAICS = (naicsId) =>
  api.delete(`/api/compliance/company/naics/${naicsId}`);

export const updateCompanyComplianceStatus = (complianceId, data) =>
  api.put(`/api/compliance/company/compliance/${complianceId}`, data);

export const runComplianceCheck = () =>
  api.get("/api/compliance/company/check");

export const getRecommendations = () =>
  api.get("/api/compliance/company/recommendations");

export const runProposalComplianceCheck = (proposalId) =>
  api.post(`/api/compliance/proposal/${proposalId}/check`);

export const getProposalComplianceCheck = (proposalId) =>
  api.get(`/api/compliance/proposal/${proposalId}/check`);

//
// ==================== N8N ====================
//
export const getN8NWorkflows = () =>
  api.get("/api/n8n/workflows");

export const getN8NRuns = (limit = 20) =>
  api.get("/api/n8n/runs", { params: { limit } });

export const getN8NRunDetails = (runId) =>
  api.get(`/api/n8n/runs/${runId}`);

export const triggerN8NWorkflow = (data) =>
  api.post("/api/n8n/trigger", data);

export const deleteN8NRun = (runId) =>
  api.delete(`/api/n8n/runs/${runId}`);

export const getN8NSettings = () =>
  api.get("/api/n8n/settings");

export const updateN8NSettings = (data) =>
  api.put("/api/n8n/settings", data);

export const exportN8NWorkflow = (type) =>
  api.get(`/api/n8n/workflows/${type}/export`);

export const n8nWebhookCallback = (data) =>
  api.post("/api/n8n/webhook", data);

export default api;