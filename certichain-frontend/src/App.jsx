import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './context/Web3Context';
import { TransactionProvider } from './context/TransactionContext';
import { DemoProvider } from './context/DemoContext';
import { BackendProvider } from './context/BackendContext';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { IssueCertificatePage } from './pages/IssueCertificatePage';
import { CertificatesPage } from './pages/CertificatesPage';
import { CertificateDetailPage } from './pages/CertificateDetailPage';
import { VerifyCertificatePage } from './pages/VerifyCertificatePage';
import { MyCertificatesPage } from './pages/MyCertificatesPage';
import { TransactionLogPage } from './pages/TransactionLogPage';
import { IssuerManagementPage } from './pages/IssuerManagementPage';
import { DemoFlowPage } from './pages/DemoFlowPage';
import { BackendLabPage } from './pages/BackendLabPage';
import { NotarizePage } from './pages/NotarizePage';

export default function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <TransactionProvider>
          <BackendProvider>
            <DemoProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/issue" element={<IssueCertificatePage />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/certificate/:certId" element={<CertificateDetailPage />} />
              <Route path="/verify" element={<VerifyCertificatePage />} />
              <Route path="/my-certificates" element={<MyCertificatesPage />} />
              <Route path="/transactions" element={<TransactionLogPage />} />
              <Route path="/issuers" element={<IssuerManagementPage />} />
              <Route path="/demo" element={<DemoFlowPage />} />
              <Route path="/backend-lab" element={<BackendLabPage />} />
              <Route path="/notarize" element={<NotarizePage />} />
            </Routes>
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1d2e',
                  color: '#e2e8f0',
                  border: '1px solid #2d3348',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#1a1d2e',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1a1d2e',
                  },
                },
              }}
            />
          </DemoProvider>
          </BackendProvider>
        </TransactionProvider>
      </Web3Provider>
    </BrowserRouter>
  );
}
