'use client'

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoIcon, Upload, AlertCircle, ArrowLeft, Save, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function RealtimeDetection(){
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResults, setDetectionResults] = useState<any>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [savingToInventory, setSavingToInventory] = useState(false);
  
  const uploadVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check if it's a video file
      if (!file.type.startsWith('video/')) {
        setError("Please select a valid video file");
        return;
      }
      
      setUploadedVideo(file);
      setError("");
      
      // Create preview and set it
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      
      // Preview the video
      if (uploadVideoRef.current) {
        uploadVideoRef.current.src = objectUrl;
      }
    }
  };
  
  const analyzeVideo = async () => {
    if (!uploadedVideo) {
      setError("Please select a video file first");
      return;
    }
    
    setIsAnalyzing(true);
    setError("");
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedVideo);
      
      const response = await fetch('http://localhost:8000/detect-video', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze video');
      }
      
      const data = await response.json();
      setDetectionResults(data);
      setCurrentFrameIndex(0);
      toast.success(`Analysis complete: ${Object.keys(data.class_counts).length} object types detected`);
      
    } catch (err: any) {
      console.error("Error analyzing video:", err);
      setError(err.message || 'Failed to analyze video');
      toast.error("Error analyzing video. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const showNextFrame = () => {
    if (!detectionResults || !detectionResults.processed_frames) return;
    setCurrentFrameIndex((prev) => 
      prev < detectionResults.processed_frames.length - 1 ? prev + 1 : prev
    );
  };
  
  const showPreviousFrame = () => {
    setCurrentFrameIndex((prev) => prev > 0 ? prev - 1 : 0);
  };

  const resetVideoAnalysis = () => {
    setDetectionResults(null);
    setUploadedVideo(null);
    setCurrentFrameIndex(0);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (uploadVideoRef.current) uploadVideoRef.current.src = '';
  };
  
  const handleAddToInventory = async () => {
    if (!detectionResults || !detectionResults.class_counts) return;
    
    setSavingToInventory(true);
    
    try {
      // Map detected class names to database item names based on classes.txt
      // These must match EXACTLY what's in the database
      const classToItemMap: Record<string, string> = {
        'FireExtinguisher': 'Fire Extinguisher',
        'ToolBox': 'Toolbox',
        'OxygenTank': 'Oxygen Tank'
      };
      
      // Prepare detected items from class counts
      const detectedItems: Record<string, number> = {};
      
      // Convert class_counts to proper format
      Object.entries(detectionResults.class_counts).forEach(([className, count]) => {
        const itemName = classToItemMap[className] || className;
        detectedItems[itemName] = count as number;
      });
      
      console.log('Detected items:', detectedItems);
      
      // Fetch current items from database
      const { data: currentItems, error: fetchError } = await supabase
        .from('items')
        .select('*');
      
      if (fetchError) {
        console.error('Error fetching items:', fetchError);
        toast.error('Failed to fetch current inventory');
        return;
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
            .select();
          
          if (error) {
            console.error(`Error updating ${existingItem.name}:`, error);
            toast.error(`Failed to update ${existingItem.name}`);
          } else {
            console.log(`Updated ${existingItem.name} result:`, data);
            toast.success(`Updated ${existingItem.name}: +${count}`);
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
            .select();
          
          if (error) {
            console.error(`Error creating ${itemName}:`, error);
            toast.error(`Failed to add ${itemName}`);
          } else {
            console.log(`Created ${itemName} result:`, data);
            toast.success(`Added new item: ${itemName} (${count})`);
          }
        }
      }
      
      toast.success('Inventory updated successfully!');
      router.push('/home');
    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast.error('Failed to update inventory');
    } finally {
      setSavingToInventory(false);
    }
  };
  
  const handleCancel = () => {
    resetVideoAnalysis();
    router.push('/home');
  };

  useEffect(() => {
    return () => {
      // Clean up preview URL
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  
  return(
    <>
      <NavBar />
      <div className="py-18 px-35">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/home" className="flex items-center mb-5 cursor-pointer gap-1 text-muted-foreground hover:text-primary transition-all duration-300">
                <ArrowLeft size={18}/> Back
              </Link>
          <h1 className="text-3xl font-bold">Video Detection</h1>
              <p className="text-muted-foreground mt-1">Detect objects from uploaded videos</p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {detectionResults ? 'Analysis Complete' : 'Ready for Analysis'}
            </Badge>
        </div>
          
          <Separator />
        
        <Card>
          <CardHeader>
            <CardTitle>Video Upload Detection</CardTitle>
            <CardDescription>
              Upload a video file to detect objects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                {!detectionResults ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Select a video</label>
                      <div className="lg:h-48 border rounded-md overflow-hidden bg-muted/30 relative">
                        {preview ? (
                          <video 
                            ref={uploadVideoRef}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <VideoIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                            <p className="mt-2 text-sm text-muted-foreground">No video selected</p>
                          </div>
                        )}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            <p className="text-white mb-2">Analyzing video...</p>
                            <Progress value={45} className="w-3/4" />
                          </div>
                        )}
                      </div>
                      
                      {error && (
                        <p className="text-red-500 text-sm mt-2">{error}</p>
                      )}
                      
                      <div className="flex justify-between mt-4">
                        <label className="cursor-pointer">
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="video/*"
                            className="hidden" 
                            onChange={handleFileSelect}
                            disabled={isAnalyzing}
                          />
                          <Button variant="outline" size="sm" disabled={isAnalyzing} asChild>
                            <span><Upload className="mr-2 h-4 w-4" /> Browse Files</span>
                          </Button>
                        </label>
                        <Button 
                          size="sm"
                          onClick={analyzeVideo} 
                          disabled={!uploadedVideo || isAnalyzing}
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="lg:h-48 border rounded-md overflow-hidden bg-black relative">
                      {detectionResults.processed_frames.length > 0 && (
                        <img 
                          src={`data:image/jpeg;base64,${detectionResults.processed_frames[currentFrameIndex].image}`}
                          alt={`Frame ${detectionResults.processed_frames[currentFrameIndex].frame_number}`}
                          className="w-full h-full object-contain"
                        />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/70 text-white text-xs">
                        Frame {detectionResults.processed_frames[currentFrameIndex]?.frame_number || 0} 
                        of {detectionResults.total_frames || 0}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-center mt-4">
                      <Button size="sm" onClick={showPreviousFrame} disabled={currentFrameIndex === 0}>Previous</Button>
                      <Progress 
                        value={(currentFrameIndex / (detectionResults.processed_frames.length - 1)) * 100} 
                        className="w-1/2" 
                      />
                      <Button 
                        size="sm"
                        onClick={showNextFrame} 
                        disabled={currentFrameIndex === detectionResults.processed_frames.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}
              </div>
              
              <div className="lg:col-span-2">
                {!detectionResults ? (
                  <div className="flex flex-col h-full items-center justify-center border-2 border-dashed rounded-md bg-muted/20 p-6">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-center text-muted-foreground">
                      Upload and analyze a video to see results
                    </p>
                  </div>
                ) : (
                  <div className="h-full">
                    <h3 className="text-lg font-medium mb-3">Detection Results</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Card className="p-3">
                        <p className="text-sm font-medium">Total Frames</p>
                        <p className="text-xl font-bold">{detectionResults.total_frames}</p>
                      </Card>
                      <Card className="p-3">
                        <p className="text-sm font-medium">Frames Processed</p>
                        <p className="text-xl font-bold">{detectionResults.processed_frames.length}</p>
                      </Card>
                    </div>
                    
                    <h4 className="text-md font-medium mb-2">Objects Detected</h4>
                    <div className="max-h-32 overflow-y-auto border rounded-md divide-y mb-4">
                      {Object.entries(detectionResults.class_counts).map(([className, count]) => (
                        <div key={className} className="p-2 flex justify-between">
                          <span>{className}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-3 justify-end mt-4">
                      <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={savingToInventory}
                        size="sm"
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                      <Button 
                        onClick={handleAddToInventory} 
                        disabled={savingToInventory}
                        size="sm"
                      >
                        <Save className="mr-2 h-4 w-4" /> Add to Inventory
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  )
}