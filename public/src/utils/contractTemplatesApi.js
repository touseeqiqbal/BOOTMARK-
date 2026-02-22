import api from './api';

export const contractTemplatesApi = {
    getAll: async () => {
        const response = await api.get('/contract-templates');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/contract-templates/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/contract-templates', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/contract-templates/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/contract-templates/${id}`);
        return response.data;
    }
};
