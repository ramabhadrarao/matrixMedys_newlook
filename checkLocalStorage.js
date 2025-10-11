// Script to check local storage authentication data
// This should be run in the browser console

console.log('=== Checking Local Storage Authentication Data ===');

// Get the auth storage data
const authStorage = localStorage.getItem('auth-storage');
if (authStorage) {
  try {
    const authData = JSON.parse(authStorage);
    console.log('Auth Storage Data:', authData);
    
    if (authData.state) {
      console.log('\n=== User Info ===');
      console.log('User:', authData.state.user);
      
      console.log('\n=== Permissions ===');
      console.log('Permissions count:', authData.state.permissions?.length || 0);
      console.log('Permissions:', authData.state.permissions);
      
      console.log('\n=== Authentication Status ===');
      console.log('Is Authenticated:', authData.state.isAuthenticated);
      console.log('Access Token exists:', !!authData.state.accessToken);
      
      // Check for warehouse approval permissions specifically
      const warehousePermissions = authData.state.permissions?.filter(p => 
        p.resource === 'warehouse_approval'
      ) || [];
      
      console.log('\n=== Warehouse Approval Permissions ===');
      console.log('Warehouse permissions:', warehousePermissions);
      
      // Check if the specific permission exists
      const hasCreatePermission = authData.state.permissions?.some(p => 
        p.resource === 'warehouse_approval' && p.action === 'create'
      );
      
      console.log('Has warehouse_approval:create permission:', hasCreatePermission);
    }
  } catch (error) {
    console.error('Error parsing auth storage:', error);
  }
} else {
  console.log('No auth storage found in localStorage');
}

console.log('\n=== All localStorage keys ===');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`${key}:`, localStorage.getItem(key));
}