import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import messService from '../../services/messService';
import { motion, AnimatePresence } from 'framer-motion';
import MessQRCodeModal from '../../components/admin/MessQRCodeModal';

const AdminMessManagement = () => {
  const [messes, setMesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedMess, setSelectedMess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    radius_meters: 200,
    contact_phone: '',
    contact_email: '',
    capacity: '',
    description: ''
  });

  useEffect(() => {
    fetchMesses();
  }, []);

  const fetchMesses = async () => {
    try {
      setLoading(true);
      const response = await messService.getAllMesses();

      // Handle the response - it's already unwrapped by axios interceptor
      if (response && response.success !== false) {
        // If response has data.messes, use it
        const messesList = response.data?.messes || response.messes || [];
        setMesses(messesList);

        if (messesList.length === 0) {
          toast.info('No messes found. Create your first mess!');
        }
      } else {
        toast.error(response?.message || 'Failed to fetch messes');
        setMesses([]);
      }
    } catch (error) {

      // Show more specific error message
      const errorMessage = error.response?.data?.message
        || error.message
        || 'Failed to fetch messes. Please check console for details.';
      toast.error(errorMessage);
      setMesses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const messData = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius_meters: parseInt(formData.radius_meters),
        capacity: parseInt(formData.capacity)
      };

      // Remove code field when creating new mess (it's auto-generated in backend)
      if (!isEdit) {
        delete messData.code;
      }

      let response;
      if (isEdit) {
        response = await messService.updateMess(selectedMess.mess_id || selectedMess._id, messData);
      } else {
        response = await messService.createMess(messData);
      }

      if (response.success) {
        toast.success(isEdit ? 'Mess updated successfully!' : 'Mess created successfully!');
        setShowModal(false);
        fetchMesses();
        resetForm();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} mess`);
    }
  };

  const handleToggleStatus = async (mess) => {
    try {
      const response = await messService.toggleMessStatus(mess.mess_id || mess._id);
      if (response.success) {
        toast.success('Mess status updated!');
        fetchMesses();
      }
    } catch (error) {
      toast.error('Failed to update mess status');
    }
  };

  const handleDeleteMess = async (mess) => {
    if (!window.confirm(`Are you sure you want to delete "${mess.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await messService.deleteMess(mess.mess_id || mess._id);
      if (response.success) {
        toast.success('Mess deleted successfully!');
        fetchMesses();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete mess');
    }
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setSelectedMess(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (mess) => {
    setIsEdit(true);
    setSelectedMess(mess);
    setFormData({
      name: mess.name || '',
      code: mess.code || '',
      address: mess.address || '',
      city: mess.city || '',
      state: mess.state || '',
      pincode: mess.pincode || '',
      latitude: mess.latitude || '',
      longitude: mess.longitude || '',
      radius_meters: mess.radius_meters || 200,
      contact_phone: mess.contact_phone || '',
      contact_email: mess.contact_email || '',
      capacity: mess.capacity || '',
      description: mess.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      latitude: '',
      longitude: '',
      radius_meters: 200,
      contact_phone: '',
      contact_email: '',
      capacity: '',
      description: ''
    });
    setSelectedMess(null);
  };

  const handleViewQRCode = (mess) => {
    setSelectedMess(mess);
    setShowQRModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
            Mess Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all mess locations and configurations</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 transition-all duration-200 font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Mess
        </button>
      </div>

      {/* Mess Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading messes...</p>
        </div>
      ) : messes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
          <BuildingOfficeIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Messes Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first mess location</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create First Mess
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {messes.map((mess) => (
            <motion.div
              key={mess.mess_id || mess._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              {/* Status Header */}
              <div className={`px-6 py-4 flex justify-between items-center ${
                mess.status === 'active'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    mess.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/40'
                      : 'bg-red-100 dark:bg-red-900/40'
                  }`}>
                    <BuildingOfficeIcon className={`w-5 h-5 ${
                      mess.status === 'active' ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{mess.name}</h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{mess.code}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus(mess)}
                  className={`p-2 rounded-lg transition-all ${
                    mess.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60'
                      : 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60'
                  }`}
                  title={mess.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                  {mess.status === 'active' ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-600" />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{mess.address}</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">{mess.city}, {mess.state} {mess.pincode}</p>
                  </div>
                </div>

                {/* Capacity */}
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <UsersIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Capacity</p>
                    <p className="font-semibold">{mess.capacity} Students</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <PhoneIcon className="w-4 h-4" />
                    <span>{mess.contact_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span className="truncate">{mess.contact_email}</span>
                  </div>
                </div>

                {/* Geolocation */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Geofence</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{mess.radius_meters}m radius</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                    {mess.latitude?.toFixed(4)}, {mess.longitude?.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleViewQRCode(mess)}
                  className="p-2.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  title="View QR Code"
                >
                  <QrCodeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openEditModal(mess)}
                  className="p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit Mess"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteMess(mess)}
                  className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete Mess"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <BuildingOfficeIcon className="w-7 h-7 text-blue-600" />
                  {isEdit ? 'Edit Mess' : 'Create New Mess'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Mess Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        placeholder="e.g., Hostel A Mess"
                        required
                      />
                    </div>
                    {isEdit && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Mess Code
                        </label>
                        <input
                          type="text"
                          name="code"
                          value={formData.code}
                          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white transition-all uppercase font-mono cursor-not-allowed"
                          disabled
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Mess code is auto-generated and cannot be changed
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                      placeholder="Enter full address"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Pincode
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        pattern="[0-9]{6}"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        placeholder="6 digits"
                      />
                    </div>
                  </div>

                  {/* Geolocation */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MapPinIcon className="w-5 h-5 text-blue-600" />
                      Geolocation Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Latitude <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          name="latitude"
                          value={formData.latitude}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                          placeholder="26.9124"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Longitude <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          name="longitude"
                          value={formData.longitude}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                          placeholder="75.7873"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Radius (meters) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="radius_meters"
                          value={formData.radius_meters}
                          onChange={handleInputChange}
                          min="10"
                          max="5000"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact & Capacity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Contact Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="contact_phone"
                        value={formData.contact_phone}
                        onChange={handleInputChange}
                        pattern="[0-9]{10}"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        placeholder="10 digits"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Contact Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="contact_email"
                        value={formData.contact_email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Capacity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        min="10"
                        max="10000"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        placeholder="e.g., 500"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all resize-none"
                      placeholder="Optional description about this mess"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg shadow-blue-500/30 transition-all duration-200"
                  >
                    {isEdit ? 'Update Mess' : 'Create Mess'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <MessQRCodeModal
        mess={selectedMess}
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setSelectedMess(null);
        }}
      />
    </div>
  );
};

export default AdminMessManagement;
