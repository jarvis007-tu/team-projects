import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiCalendar,
  FiDownload, FiUpload, FiImage, FiX, FiEye,
  FiCopy, FiSave, FiRefreshCw
} from 'react-icons/fi';
import { MdRestaurantMenu, MdFastfood, MdLocalDining } from 'react-icons/md';
import menuService from '../../services/menuService';
import { toast } from 'react-hot-toast';

const AdminMenuManagement = () => {
  const [currentView, setCurrentView] = useState('weekly'); // weekly, items, templates
  const [weeklyMenu, setWeeklyMenu] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [menuTemplates, setMenuTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return monday.toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    image_url: '',
    nutritional_info: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: ''
    },
    allergens: [],
    is_vegetarian: false,
    is_vegan: false,
    is_available: true
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    menu_data: {}
  });

  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchData();
  }, [currentView, selectedWeek, searchTerm, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (currentView === 'weekly') {
        await fetchWeeklyMenu();
      } else if (currentView === 'items') {
        await fetchMenuItems();
        await fetchCategories();
      } else if (currentView === 'templates') {
        await fetchMenuTemplates();
      }
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyMenu = async () => {
    try {
      const response = await menuService.getWeeklyMenu(selectedWeek);
      setWeeklyMenu(response.data);
    } catch (error) {
      toast.error('Failed to fetch weekly menu');
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await menuService.getMenuItems({
        search: searchTerm || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined
      });
      setMenuItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch menu items');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await menuService.getMenuCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchMenuTemplates = async () => {
    try {
      const response = await menuService.getMenuTemplates();
      setMenuTemplates(response.data);
    } catch (error) {
      toast.error('Failed to fetch menu templates');
    }
  };

  const handleUpdateWeeklyMenu = async (day, mealType, itemIds) => {
    try {
      const updatedMenu = {
        ...weeklyMenu,
        [day]: {
          ...weeklyMenu[day],
          [mealType]: itemIds
        }
      };
      
      await menuService.updateWeeklyMenu({
        start_date: selectedWeek,
        menu_data: updatedMenu
      });
      
      setWeeklyMenu(updatedMenu);
      toast.success('Weekly menu updated successfully');
    } catch (error) {
      toast.error('Failed to update weekly menu');
    }
  };

  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    try {
      await menuService.createMenuItem(newItem);
      toast.success('Menu item created successfully');
      setShowItemModal(false);
      setNewItem({
        name: '',
        description: '',
        category: '',
        price: '',
        image_url: '',
        nutritional_info: {
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          fiber: ''
        },
        allergens: [],
        is_vegetarian: false,
        is_vegan: false,
        is_available: true
      });
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to create menu item');
    }
  };

  const handleUpdateMenuItem = async (e) => {
    e.preventDefault();
    try {
      await menuService.updateMenuItem(currentItem.item_id, currentItem);
      toast.success('Menu item updated successfully');
      setShowItemModal(false);
      setCurrentItem(null);
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to update menu item');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await menuService.deleteMenuItem(itemId);
        toast.success('Menu item deleted successfully');
        fetchMenuItems();
      } catch (error) {
        toast.error('Failed to delete menu item');
      }
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await menuService.createMenuTemplate({
        ...newTemplate,
        menu_data: weeklyMenu
      });
      toast.success('Menu template created successfully');
      setShowTemplateModal(false);
      setNewTemplate({
        name: '',
        description: '',
        menu_data: {}
      });
      fetchMenuTemplates();
    } catch (error) {
      toast.error('Failed to create menu template');
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to apply this template? Current menu will be replaced.')) {
      try {
        await menuService.applyMenuTemplate(templateId, selectedWeek);
        toast.success('Template applied successfully');
        fetchWeeklyMenu();
      } catch (error) {
        toast.error('Failed to apply template');
      }
    }
  };

  const handlePreviewMenu = async () => {
    try {
      const response = await menuService.getMenuPreview(selectedWeek);
      setPreviewData(response.data);
      setShowPreviewModal(true);
    } catch (error) {
      toast.error('Failed to generate preview');
    }
  };

  const handleExportMenu = async () => {
    try {
      const endDate = new Date(selectedWeek);
      endDate.setDate(endDate.getDate() + 6);
      
      const response = await menuService.exportMenu(
        selectedWeek,
        endDate.toISOString().split('T')[0]
      );
      
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `menu-${selectedWeek}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Menu exported successfully');
    } catch (error) {
      toast.error('Failed to export menu');
    }
  };

  const handleImageUpload = async (itemId, file) => {
    try {
      await menuService.uploadMenuImage(itemId, file);
      toast.success('Image uploaded successfully');
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage weekly menus, items, and templates</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportMenu}
              className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Export
            </button>
            {currentView === 'weekly' && (
              <button
                onClick={handlePreviewMenu}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <FiEye className="w-4 h-4 mr-2" />
                Preview
              </button>
            )}
            {currentView === 'items' && (
              <button
                onClick={() => setShowItemModal(true)}
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            )}
            {currentView === 'weekly' && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <FiSave className="w-4 h-4 mr-2" />
                Save Template
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* View Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setCurrentView('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'weekly'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Weekly Menu
            </button>
            <button
              onClick={() => setCurrentView('items')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'items'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Menu Items
            </button>
            <button
              onClick={() => setCurrentView('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'templates'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Templates
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {currentView === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Week Starting
                </label>
                <input
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            {currentView === 'items' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {/* Weekly Menu View */}
            {currentView === 'weekly' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 p-6">
                  {days.map((day, dayIndex) => (
                    <div key={day} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">
                        {day}
                      </h3>
                      {mealTypes.map((mealType) => (
                        <div key={mealType} className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                            {mealType}
                          </h4>
                          <div className="space-y-2">
                            {weeklyMenu[day]?.[mealType]?.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-gray-50 dark:bg-gray-600 rounded text-sm text-gray-600 dark:text-gray-300"
                              >
                                {item.name || `Item ${item}`}
                              </div>
                            )) || (
                              <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded text-sm text-gray-400 dark:text-gray-300 text-center">
                                No items
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              // This would open a menu item selector modal
                              // For now, just show a placeholder
                              toast.info('Menu item selector not implemented in demo');
                            }}
                            className="w-full mt-2 p-1 border border-dashed border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-400 hover:border-primary-300 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400"
                          >
                            + Add Item
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items View */}
            {currentView === 'items' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {menuItems.map((item) => (
                  <div key={item.item_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="aspect-w-16 aspect-h-9">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <MdFastfood className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                        <span className="text-lg font-bold text-primary-600">
                          ₹{item.price}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{item.description}</p>
                      
                      <div className="flex items-center space-x-2 mb-3">
                        {item.is_vegetarian && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Veg
                          </span>
                        )}
                        {item.is_vegan && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Vegan
                          </span>
                        )}
                        {!item.is_available && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            Unavailable
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setCurrentItem(item);
                              setShowItemModal(true);
                            }}
                            className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.item_id)}
                            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <label className="cursor-pointer">
                          <FiImage className="w-4 h-4 text-gray-600 hover:text-primary-600" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleImageUpload(item.item_id, file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Templates View */}
            {currentView === 'templates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuTemplates.map((template) => (
                  <div key={template.template_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                      <MdRestaurantMenu className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{template.description}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApplyTemplate(template.template_id)}
                        className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          // Preview template functionality
                          toast.info('Template preview not implemented in demo');
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">
                {currentItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setCurrentItem(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={currentItem ? handleUpdateMenuItem : handleCreateMenuItem} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={currentItem ? currentItem.name : newItem.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentItem) {
                        setCurrentItem({...currentItem, name: value});
                      } else {
                        setNewItem({...newItem, name: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentItem ? currentItem.price : newItem.price}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentItem) {
                        setCurrentItem({...currentItem, price: value});
                      } else {
                        setNewItem({...newItem, price: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    value={currentItem ? currentItem.description : newItem.description}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentItem) {
                        setCurrentItem({...currentItem, description: value});
                      } else {
                        setNewItem({...newItem, description: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Category
                  </label>
                  <select
                    value={currentItem ? currentItem.category : newItem.category}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentItem) {
                        setCurrentItem({...currentItem, category: value});
                      } else {
                        setNewItem({...newItem, category: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentItem ? currentItem.is_vegetarian : newItem.is_vegetarian}
                      onChange={(e) => {
                        const value = e.target.checked;
                        if (currentItem) {
                          setCurrentItem({...currentItem, is_vegetarian: value});
                        } else {
                          setNewItem({...newItem, is_vegetarian: value});
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Vegetarian</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentItem ? currentItem.is_vegan : newItem.is_vegan}
                      onChange={(e) => {
                        const value = e.target.checked;
                        if (currentItem) {
                          setCurrentItem({...currentItem, is_vegan: value});
                        } else {
                          setNewItem({...newItem, is_vegan: value});
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Vegan</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentItem ? currentItem.is_available : newItem.is_available}
                      onChange={(e) => {
                        const value = e.target.checked;
                        if (currentItem) {
                          setCurrentItem({...currentItem, is_available: value});
                        } else {
                          setNewItem({...newItem, is_available: value});
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Available</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false);
                    setCurrentItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {currentItem ? 'Update' : 'Create'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">Save Menu Template</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">Menu Preview</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {days.map((day) => (
                  <div key={day} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-center mb-4 text-gray-900 dark:text-white">{day}</h3>
                    {mealTypes.map((mealType) => (
                      <div key={mealType} className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                          {mealType}
                        </h4>
                        <div className="space-y-1">
                          {previewData[day]?.[mealType]?.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-white dark:bg-gray-600 p-2 rounded border dark:border-gray-500"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                              <div className="text-gray-500 dark:text-gray-400">₹{item.price}</div>
                            </div>
                          )) || (
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
                              No items
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenuManagement;