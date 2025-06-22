'use client'

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoIcon, CameraIcon } from "lucide-react";

export default function RealtimeDetection(){
  const [activeTab, setActiveTab] = useState("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  return(
    <>
      <NavBar />
      <div className="container mx-auto py-20 px-20 md:px-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Real-time Detection</h1>
          <Button variant="outline" onClick={() => router.push('/home')}>
            Back to Home
          </Button>
        </div>
        
        <Tabs defaultValue="camera" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <CameraIcon className="h-4 w-4" />
              Camera Detection
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4" />
              Video Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Camera Detection</CardTitle>
                <CardDescription>
                  Use your device camera to detect objects in real-time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-4 relative">
                  {cameraActive ? (
                    <>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full rounded-md object-cover"
                      />
                      <canvas 
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full rounded-md"
                      />
                    </>
                  ) : (
                    <CameraIcon className="h-24 w-24 text-muted-foreground opacity-50" />
                  )}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline">Settings</Button>
                  <Button onClick={cameraActive ? stopCamera : startCamera}>
                    {cameraActive ? "Stop Camera" : "Start Camera"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="video" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Video Upload Detection</CardTitle>
                <CardDescription>
                  Upload a video file to detect objects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-4">
                  <VideoIcon className="h-24 w-24 text-muted-foreground opacity-50" />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline">Browse Files</Button>
                  <Button disabled>Analyze Video</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}