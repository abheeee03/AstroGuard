'use client'

import { useState, useRef, FormEvent } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Upload, CheckCircle2, ImageIcon, ArrowBigLeft, ArrowLeft, Save, X } from 'lucide-react'
import NavBar from '@/components/NavBar'
import ModeToggle from '@/components/theme-switcher'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { log } from 'console'

interface Detection {
  class_id: number
  class_name: string
  confidence: number
  bbox: number[]
}

interface DetectionResult {
  detections: Detection[]
  image: string
  count: number
}

export default function DetectImage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [savingToInventory, setSavingToInventory] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    setSelectedFile(file)
    
    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    
    // Reset results
    setResult(null)
    setImageUrl(null)
  }

  const uploadToSupabase = async (file: File): Promise<string | null> => {
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `img/${fileName}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('detections')
        .upload(filePath, file)
      
      if (error) {
        console.error('Error uploading file:', error)
        toast.error('Failed to upload image to storage')
        return null
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('detections')
        .getPublicUrl(filePath)
      
      const publicUrl = urlData.publicUrl
      
      // Save metadata to the uploaded_images table
      const { data: imageRecord, error: dbError } = await supabase
        .from('uploaded_images')
        .insert({
          file_name: file.name,
          storage_path: filePath,
          public_url: publicUrl,
          content_type: file.type,
          size_bytes: file.size,
          detection_count: 0 // Will be updated after detection
        })
        .select()
      
      if (dbError) {
        console.error('Error saving image metadata:', dbError)
        toast.error('Failed to save image metadata')
      } else {
        console.log('Saved image metadata:', imageRecord)
      }
      
      return publicUrl
    } catch (error) {
      console.error('Error in upload process:', error)
      return null
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    
    setLoading(true)
    
    try {
      // First upload the file to Supabase Storage
      const imageUrl = await uploadToSupabase(selectedFile)
      setImageUrl(imageUrl)
      
      // Then send to detection API
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const response = await axios.post('http://localhost:8000/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setResult(response.data)
      console.log(response.data);
      
      // Update the detection count in the uploaded_images table
      if (imageUrl) {
        const { error: updateError } = await supabase
          .from('uploaded_images')
          .update({ 
            detection_count: response.data.detections.length 
          })
          .eq('public_url', imageUrl)
        
        if (updateError) {
          console.error('Error updating detection count:', updateError)
        }
      }
    } catch (error) {
      console.error('Error detecting objects:', error)
      toast.error('Failed to detect objects. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToInventory = async () => {
    if (!result) return
    
    setSavingToInventory(true)
    
    try {
      // Map detected class names to database item names based on classes.txt
      // These must match EXACTLY what's in the database
      const classToItemMap: Record<string, string> = {
        'FireExtinguisher': 'Fire Extinguisher',
        'ToolBox': 'Toolbox',
        'OxygenTank': 'Oxygen Tank'
      }
      
      // Count occurrences of each item
      const detectedItems: Record<string, number> = {}
      
      result.detections.forEach(detection => {
        console.log('Detected class:', detection.class_name);
        const itemName = classToItemMap[detection.class_name] || detection.class_name
        detectedItems[itemName] = (detectedItems[itemName] || 0) + 1
      })
      
      console.log('Detected items:', detectedItems);
      
      // Fetch current items from database
      const { data: currentItems, error: fetchError } = await supabase
        .from('items')
        .select('*')
      
      if (fetchError) {
        console.error('Error fetching items:', fetchError)
        toast.error('Failed to fetch current inventory')
        return
      }
      
      console.log('Current items in database:', currentItems);
      
      // Update each item in the database
      for (const [itemName, count] of Object.entries(detectedItems)) {
        // Find the item in the current items (exact match first)
        let existingItem = currentItems?.find(item => item.name === itemName);
        
        // If not found, try case-insensitive match
        if (!existingItem) {
          existingItem = currentItems?.find(item => 
            item.name.toLowerCase() === itemName.toLowerCase()
          );
        }
        
        console.log(`Processing ${itemName}, exists:`, existingItem ? existingItem.name : "not found");
        
        if (existingItem) {
          // Update existing item
          const newQuantity = existingItem.quantity + count;
          console.log(`Updating ${existingItem.name} from ${existingItem.quantity} to ${newQuantity}`);
          
          const { data, error } = await supabase
            .from('items')
            .update({ 
              quantity: newQuantity 
            })
            .eq('id', existingItem.id)
            .select()
          
          if (error) {
            console.error(`Error updating ${existingItem.name}:`, error)
            toast.error(`Failed to update ${existingItem.name}`)
          } else {
            console.log(`Updated ${existingItem.name} result:`, data);
            toast.success(`Updated ${existingItem.name}: +${count}`)
          }
        } else {
          // Create new item
          console.log(`Creating new item: ${itemName} with quantity ${count}`);
          
          const { data, error } = await supabase
            .from('items')
            .insert({ 
              name: itemName, 
              quantity: count 
            })
            .select()
          
          if (error) {
            console.error(`Error creating ${itemName}:`, error)
            toast.error(`Failed to add ${itemName}`)
          } else {
            console.log(`Created ${itemName} result:`, data);
            toast.success(`Added new item: ${itemName} (${count})`)
          }
        }
      }
      
      toast.success('Inventory updated successfully!')
      router.push('/home')
    } catch (error) {
      console.error('Error adding to inventory:', error)
      toast.error('Failed to update inventory')
    } finally {
      setSavingToInventory(false)
    }
  }

  const handleCancel = () => {
    router.push('/home')
  }
  
  return (
    <>
    <div className="container py-8 px-15 p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/home" className='flex items-center cursor-pointer gap-1 text-muted-foreground hover:text-primary transition-all duration-300'> <ArrowLeft size={18}/> Back</Link>
            <h1 className="text-3xl font-bold">Image Detection</h1>
            <p className="text-muted-foreground mt-1">Detect items from an image</p>
          </div>
          <div className="flex items-center justify-center gap-2">

          <Badge variant="outline" className="px-3 py-1">
            {result ? 'Analysis Complete' : 'Ready for Analysis'}
          </Badge>
          <ModeToggle/>
          </div>
        </div>
        
        <Separator />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload size={18} />
                  Image Upload
                </CardTitle>
                <CardDescription>
                  Upload an image to detect safety equipment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="image">Select an image</Label>
                    <div className="relative">
                      <Input
                        ref={fileInputRef}
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {preview ? (
                    <div className="relative w-full h-48 border rounded-md overflow-hidden bg-muted/30">
                      <Image 
                        src={preview} 
                        alt="Preview" 
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-md bg-muted/20">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">No image selected</p>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={!selectedFile || loading}
                    className="w-full"
                  >
                    {loading ? 'Processing...' : 'Analyze Image'}
                    {loading && <Progress className="mt-2" value={50} />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Tabs defaultValue="results" className="h-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="results">Detection Results</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {result ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      Detection Results
                    </CardTitle>
                    {result && (
                      <CardDescription>
                        {result.count} objects detected in the image
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {result ? (
                      <div className="space-y-6">
                        <div className="relative w-full h-64 border rounded-md overflow-hidden">
                          <Image
                            src={`data:image/jpeg;base64,${result.image}`}
                            alt="Detection Result"
                            fill
                            className="object-contain"
                          />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-3">Detected Objects</h3>
                          <div className="space-y-3">
                            {result.detections.map((detection, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-primary/10">
                                    {index + 1}
                                  </Badge>
                                  <span className="font-medium">{detection.class_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={detection.confidence * 100} 
                                    className="w-24 h-2" 
                                  />
                                  <span className="text-sm text-muted-foreground w-16">
                                    {(detection.confidence * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end pt-4">
                          <Button 
                            variant="outline" 
                            onClick={handleCancel}
                            disabled={savingToInventory}
                          >
                            <X className="mr-2 h-4 w-4" /> Cancel
                          </Button>
                          <Button 
                            onClick={handleAddToInventory} 
                            disabled={savingToInventory}
                          >
                            <Save className="mr-2 h-4 w-4" /> Add to Inventory
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-md bg-muted/20">
                        <AlertCircle className="h-10 w-10 text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Upload and analyze an image to see results</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Detection Analytics</CardTitle>
                    <CardDescription>
                      Detailed analysis of detected objects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">Total Objects</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{result.count}</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">Confidence Level</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">
                                {result.detections.length > 0 
                                  ? `${(result.detections.reduce((acc, det) => acc + det.confidence, 0) / result.detections.length * 100).toFixed(1)}%`
                                  : "N/A"
                                }
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-3">Object Categories</h3>
                          <div className="space-y-2">
                            {Array.from(new Set(result.detections.map(d => d.class_name))).map((className, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span>{className}</span>
                                <Badge variant="secondary">
                                  {result.detections.filter(d => d.class_name === className).length}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end pt-4">
                          <Button 
                            variant="outline" 
                            onClick={handleCancel}
                            disabled={savingToInventory}
                          >
                            <X className="mr-2 h-4 w-4" /> Cancel
                          </Button>
                          <Button 
                            onClick={handleAddToInventory} 
                            disabled={savingToInventory}
                          >
                            <Save className="mr-2 h-4 w-4" /> Add to Inventory
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-md bg-muted/20">
                        <AlertCircle className="h-10 w-10 text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">No analytics available yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}