"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner"
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';

type Item = {
  id: string;
  name: string;
  quantity: number;
};

function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('Oxygen Tank');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [removeQuantity, setRemoveQuantity] = useState<number>(1);
  const router = useRouter();
  useEffect(() => {
    // Fetch initial data
    fetchItems();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('items-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'items' }, 
        (payload) => {
          fetchItems();
        }
      )
      .subscribe();
    
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*');
      
      if (error) {
        toast.error('Error fetching items: ' + error.message);
      } else {
        setItems(data);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddItem = async () => {
    try {
      // Find the item to update
      const itemToUpdate = items.find(item => item.name === selectedItem);
      
      if (itemToUpdate) {
        const newQuantity = itemToUpdate.quantity + quantity;
        
        const { error } = await supabase
          .from('items')
          .update({ quantity: newQuantity })
          .eq('id', itemToUpdate.id);
        
        if (error) {
          toast.error('Error updating item: ' + error.message);
        } else {
          // Update local state immediately
          setItems(items.map(item => 
            item.id === itemToUpdate.id 
              ? { ...item, quantity: newQuantity } 
              : item
          ));
          toast.success(`Added ${quantity} ${selectedItem}(s) to inventory.`);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };
  
  const handleRemoveItem = async (itemId: string, itemName: string) => {
    try {
      // Find the item to update
      const itemToUpdate = items.find(item => item.id === itemId);
      
      if (itemToUpdate && itemToUpdate.quantity > 0) {
        const newQuantity = itemToUpdate.quantity - 1;
        
        const { error } = await supabase
          .from('items')
          .update({ quantity: newQuantity })
          .eq('id', itemId);
        
        if (error) {
          toast.error('Error updating item: ' + error.message);
        } else {
          setItems(items.map(item => 
            item.id === itemId 
              ? { ...item, quantity: newQuantity } 
              : item
          ));
          toast.error(`Removed 1 ${itemName} from inventory.`);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };
  
  const openItemModal = (item: Item) => {
    setCurrentItem(item);
    setRemoveQuantity(1);
    setIsModalOpen(true);
  };
  
  const handleMultiRemove = async () => {
    if (!currentItem) return;
    
    try {
      // Ensure we don't remove more than available
      const quantityToRemove = Math.min(removeQuantity, currentItem.quantity);
      const newQuantity = currentItem.quantity - quantityToRemove;
      
      const { error } = await supabase
        .from('items')
        .update({ quantity: newQuantity })
        .eq('id', currentItem.id);
      
      if (error) {
        toast.error('Error updating item: ' + error.message);
      } else {
        // Update local state immediately
        setItems(items.map(item => 
          item.id === currentItem.id 
            ? { ...item, quantity: newQuantity } 
            : item
        ));
        toast.error(`Removed ${quantityToRemove} ${currentItem.name}(s) from inventory.`);
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };
  
  return (
    <>
    <NavBar/>
    <div className="container mx-auto py-25 px-20">
      <h1 className="text-3xl text-center font-bold mb-6">Inventory Management</h1>
      
      <div className="flex items-center justify-center gap-4 mb-8">
        <Select
          value={selectedItem}
          onValueChange={setSelectedItem}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-24"
        />
        
        <Button onClick={handleAddItem} disabled={loading}>Add Item</Button>
      </div>
      <div className="px-40">

      <div className="mt-10 px-10 border rounded-lg py-10">

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">Loading...</TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">No items found</TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openItemModal(item)}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(item.id, item.name);
                    }}
                    className='cursor-pointer'
                    disabled={item.quantity <= 0}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {currentItem?.name}</DialogTitle>
            <DialogDescription>
              Current quantity: {currentItem?.quantity}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label htmlFor="removeQuantity" className="block text-sm font-medium mb-2">
              Quantity to remove:
            </label>
            <Input
              id="removeQuantity"
              type="number"
              min="1"
              max={currentItem?.quantity || 1}
              value={removeQuantity}
              onChange={(e) => setRemoveQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleMultiRemove}
              disabled={!currentItem || currentItem.quantity <= 0 || removeQuantity <= 0}
            >
              Remove Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ItemsPage;