import requests
import sys
import json
import io
from datetime import datetime
from pathlib import Path

class CatalogAPITester:
    def __init__(self, base_url="https://altinay-pages.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_image_id = None
        self.created_product_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    if response_data:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.content and 'application/json' in response.headers.get('content-type', '') else response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_get_catalogs(self):
        """Test get catalogs endpoint"""
        success, response = self.run_test(
            "Get Catalogs",
            "GET",
            "catalogs",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} catalogs")
            for catalog in response:
                print(f"   - {catalog.get('name', 'Unknown')}: {catalog.get('productCount', 0)} products")
        return success

    def test_image_upload(self):
        """Test image upload to GridFS"""
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_image.png', io.BytesIO(test_image_data), 'image/png')
        }
        
        success, response = self.run_test(
            "Upload Image",
            "POST",
            "upload",
            200,
            files=files
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            self.uploaded_image_id = response['id']
            print(f"   Uploaded image ID: {self.uploaded_image_id}")
        
        return success

    def test_get_image(self):
        """Test image retrieval from GridFS"""
        if not self.uploaded_image_id:
            print("❌ Skipping image retrieval - no uploaded image ID")
            return False
            
        success, response = self.run_test(
            "Get Image",
            "GET",
            f"images/{self.uploaded_image_id}",
            200
        )
        return success

    def test_create_product(self):
        """Test product creation with auto-catalog assignment"""
        test_products = [
            {
                "modelCode": "TNY0999",
                "karatOptions": ["14K", "18K", "22K"],
                "widthOptions": [2, 3, 4, 5, 6, 7, 8, 9, 10],
                "gramData": [
                    {"karat": "14K", "width": 4, "gram": 3.5},
                    {"karat": "18K", "width": 4, "gram": 4.0}
                ],
                "colors": [
                    {"name": "Yellow Gold", "images": [self.uploaded_image_id] if self.uploaded_image_id else []},
                    {"name": "White Gold", "images": []}
                ]
            },
            {
                "modelCode": "AS0888",
                "karatOptions": ["14K", "18K"],
                "widthOptions": [3, 4, 5, 6],
                "colors": [{"name": "Rose Gold", "images": []}]
            },
            {
                "modelCode": "ULT0777",
                "karatOptions": ["18K", "22K"],
                "widthOptions": [4, 5, 6, 7, 8],
                "colors": [{"name": "Yellow Gold", "images": []}]
            }
        ]
        
        all_success = True
        for i, product_data in enumerate(test_products):
            success, response = self.run_test(
                f"Create Product {i+1} ({product_data['modelCode']})",
                "POST",
                "products",
                200,
                data=product_data
            )
            
            if success and isinstance(response, dict):
                # Verify auto-catalog assignment
                expected_catalog = product_data['modelCode'][:3].upper()
                actual_catalog = response.get('catalog')
                if actual_catalog == expected_catalog:
                    print(f"   ✅ Catalog auto-assigned correctly: {actual_catalog}")
                else:
                    print(f"   ❌ Catalog assignment failed: expected {expected_catalog}, got {actual_catalog}")
                    all_success = False
                
                # Store first product ID for later tests
                if i == 0:
                    self.created_product_id = response.get('id')
                    print(f"   Stored product ID: {self.created_product_id}")
            else:
                all_success = False
        
        return all_success

    def test_get_all_products(self):
        """Test get all products"""
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} total products")
            for product in response[:3]:  # Show first 3
                print(f"   - {product.get('modelCode', 'Unknown')} ({product.get('catalog', 'No catalog')})")
        
        return success

    def test_get_products_by_catalog(self):
        """Test get products filtered by catalog"""
        catalogs = ["TNY", "AS", "ULT"]
        all_success = True
        
        for catalog in catalogs:
            success, response = self.run_test(
                f"Get {catalog} Products",
                "GET",
                f"products?catalog={catalog}",
                200
            )
            
            if success and isinstance(response, list):
                print(f"   Found {len(response)} products in {catalog} catalog")
                # Verify all products belong to the requested catalog
                for product in response:
                    if product.get('catalog') != catalog:
                        print(f"   ❌ Product {product.get('modelCode')} has wrong catalog: {product.get('catalog')}")
                        all_success = False
            else:
                all_success = False
        
        return all_success

    def test_get_single_product(self):
        """Test get single product by ID"""
        if not self.created_product_id:
            print("❌ Skipping single product test - no created product ID")
            return False
            
        success, response = self.run_test(
            "Get Single Product",
            "GET",
            f"products/{self.created_product_id}",
            200
        )
        
        if success and isinstance(response, dict):
            print(f"   Product: {response.get('modelCode')} ({response.get('catalog')})")
            print(f"   Colors: {len(response.get('colors', []))}")
            print(f"   Gram data entries: {len(response.get('gramData', []))}")
        
        return success

    def test_update_product(self):
        """Test product update"""
        if not self.created_product_id:
            print("❌ Skipping product update test - no created product ID")
            return False
            
        update_data = {
            "modelCode": "TNY0999_UPDATED",
            "karatOptions": ["14K", "18K", "22K", "24K"],
            "gramData": [
                {"karat": "14K", "width": 4, "gram": 3.8},
                {"karat": "18K", "width": 4, "gram": 4.2},
                {"karat": "22K", "width": 4, "gram": 4.5}
            ]
        }
        
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{self.created_product_id}",
            200,
            data=update_data
        )
        
        if success and isinstance(response, dict):
            print(f"   Updated model code: {response.get('modelCode')}")
            print(f"   Updated karat options: {response.get('karatOptions')}")
            print(f"   Catalog (should remain TNY): {response.get('catalog')}")
        
        return success

    def test_delete_product(self):
        """Test product deletion"""
        if not self.created_product_id:
            print("❌ Skipping product deletion test - no created product ID")
            return False
            
        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"products/{self.created_product_id}",
            200
        )
        
        if success:
            # Verify product is deleted by trying to get it
            verify_success, verify_response = self.run_test(
                "Verify Product Deleted",
                "GET",
                f"products/{self.created_product_id}",
                404
            )
            if verify_success:
                print("   ✅ Product successfully deleted and verified")
            else:
                print("   ❌ Product deletion verification failed")
                success = False
        
        return success

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        tests = [
            ("Non-existent product", "GET", "products/invalid-id", 404, None),
            ("Non-existent image", "GET", "images/invalid-id", 404, None),
            ("Invalid product creation", "POST", "products", 422, {"modelCode": ""}),
        ]
        
        all_success = True
        for name, method, endpoint, expected_status, data in tests:
            success, _ = self.run_test(name, method, endpoint, expected_status, data)
            if not success:
                all_success = False
        
        return all_success

def main():
    print("🚀 Starting Altınay Alyans Catalog API Tests")
    print("=" * 60)
    
    tester = CatalogAPITester()
    
    # Run all tests
    test_results = []
    
    # Basic API tests
    test_results.append(("Root Endpoint", tester.test_root_endpoint()))
    test_results.append(("Get Catalogs", tester.test_get_catalogs()))
    
    # Image tests
    test_results.append(("Image Upload", tester.test_image_upload()))
    test_results.append(("Image Retrieval", tester.test_get_image()))
    
    # Product CRUD tests
    test_results.append(("Create Products", tester.test_create_product()))
    test_results.append(("Get All Products", tester.test_get_all_products()))
    test_results.append(("Get Products by Catalog", tester.test_get_products_by_catalog()))
    test_results.append(("Get Single Product", tester.test_get_single_product()))
    test_results.append(("Update Product", tester.test_update_product()))
    test_results.append(("Delete Product", tester.test_delete_product()))
    
    # Error handling tests
    test_results.append(("Error Handling", tester.test_invalid_endpoints()))
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed_tests = []
    failed_tests = []
    
    for test_name, success in test_results:
        if success:
            print(f"✅ {test_name}")
            passed_tests.append(test_name)
        else:
            print(f"❌ {test_name}")
            failed_tests.append(test_name)
    
    print(f"\n📈 Overall: {len(passed_tests)}/{len(test_results)} tests passed")
    print(f"🔧 API Tests: {tester.tests_passed}/{tester.tests_run} individual API calls passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())