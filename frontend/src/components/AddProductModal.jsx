import React, { useState } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Input,
} from '@material-tailwind/react';
import { createProduct } from '../api/api';

const AddProductModal = ({ isOpen, onClose, onProductAdded }) => {
  const [productData, setProductData] = useState({
    name: '',
    price: '',
    kpi: '',
    quantity: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData({
      ...productData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await createProduct(productData);
      console.log('Product created successfully:', response.data);
      onProductAdded(response.data); // Notify parent component about the new product
      onClose(); // Close the modal after successful submission
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  return (
    <Dialog open={isOpen} handler={onClose}>
      <DialogHeader>Add Product</DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogBody divider>
          <div>
            <label>Name</label>
            <Input
              type="text"
              name="name"
              value={productData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Price</label>
            <Input
              type="number"
              name="price"
              value={productData.price}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>KPI</label>
            <Input
              type="number"
              name="kpi"
              value={productData.kpi}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Quantity</label>
            <Input
              type="number"
              name="quantity"
              value={productData.quantity}
              onChange={handleChange}
              required
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="text" color="red" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" color="green">
            Submit
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default AddProductModal;
