import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { companyAPI, datasetAPI } from '../api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, _setSelectedCompanyId] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, _setSelectedDatasetId] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  // Fetch companies
  useEffect(() => {
    if (!user) return;
    setLoadingCompanies(true);
    companyAPI.list()
      .then(res => {
        const companyList = res.data;
        setCompanies(companyList);

        // Auto-select for company user (always their own company)
        if (user.role === 'company_user' && user.company_id) {
          _setSelectedCompanyId(user.company_id);
        } else if (companyList.length === 1) {
          _setSelectedCompanyId(companyList[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, [user]);

  // Fetch datasets when company changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setDatasets([]);
      _setSelectedDatasetId(null);
      return;
    }
    setLoadingDatasets(true);
    datasetAPI.list(selectedCompanyId)
      .then(res => {
        const dsList = res.data;
        setDatasets(dsList);
        _setSelectedDatasetId((currentId) => {
          if (dsList.find(d => d.id === currentId)) return currentId;
          return dsList.length > 0 ? dsList[0].id : null;
        });
      })
      .catch(err => {
        console.error('Failed to fetch datasets:', err);
        setDatasets([]);
        _setSelectedDatasetId(null);
      })
      .finally(() => setLoadingDatasets(false));
  }, [selectedCompanyId]);

  const setSelectedCompanyId = (id) => {
    // Company users cannot change their company
    if (user?.role === 'company_user') return;
    _setSelectedCompanyId(id);
  };

  const setSelectedDatasetId = (id) => {
    _setSelectedDatasetId(id);
  };

  const refreshDatasets = async () => {
    if (!selectedCompanyId) return;
    const res = await datasetAPI.list(selectedCompanyId);
    setDatasets(res.data);
    if (res.data.length > 0 && !res.data.find(d => d.id === selectedDatasetId)) {
      _setSelectedDatasetId(res.data[0].id);
    }
  };

  const refreshCompanies = async () => {
    try {
      const res = await companyAPI.list();
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <AppContext.Provider value={{
      companies, selectedCompanyId, setSelectedCompanyId,
      datasets, selectedDatasetId, setSelectedDatasetId,
      selectedCompany, selectedDataset,
      loadingCompanies, loadingDatasets, refreshDatasets, refreshCompanies,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
