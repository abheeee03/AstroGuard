'use client'

import { useState, useRef, FormEvent } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

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

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    setSelectedFile(file)
    
    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    
    // Reset results
    setResult(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    
    setLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const response = await axios.post('http://localhost:8000/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setResult(response.data)
    } catch (error) {
      console.error('Error detecting objects:', error)
      alert('Failed to detect objects. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">AstroGuard Object Detection</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Upload Image</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="image">Select an image to detect objects</Label>
                    <Input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={loading}
                    />
                  </div>
                  
                  {preview && (
                    <div className="relative w-full h-48 border rounded-md overflow-hidden">
                      <Image 
                        src={preview} 
                        alt="Preview" 
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={!selectedFile || loading}
                    className="w-full"
                  >
                    {loading ? 'Detecting...' : 'Detect Objects'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          
          <div>
            {result ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detection Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative w-full h-48 border rounded-md overflow-hidden">
                      <Image
                        src={`data:image/jpeg;base64,${result.image}`}
                        alt="Detection Result"
                        fill
                        className="object-contain"
                      />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Objects Detected: {result.count}</h3>
                      <div className="bg-muted p-3 rounded-md">
                        {result.detections.map((detection, index) => (
                          <div key={index} className="mb-2 last:mb-0">
                            <span className="font-medium">{detection.class_name}</span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              Confidence: {(detection.confidence * 100).toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Detection Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-md bg-muted/50">
                    <p className="text-muted-foreground">Upload and detect an image to see results</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}