import NavBar from '@/components/NavBar'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

function LandingPage() {

  


  return (
    <>
    <NavBar/>
    <div className="min-h-screen w-full">
    <div className='h-screen overflow-hidden w-full gap-2 flex flex-col items-center justify-start'>
      <h3 className='border rounded-xl text-sm border-primary px-2 mt-50'>Introducing</h3>
      <div className="text-center">
      <h1 className='text-8xl font-bold'>Astro Guard</h1>
      <p className=' mt-2'>Best Maintenance Assistant and AI Based Safety Equipment Detection System</p>
      </div>
      <Link href='/home' className='bg-sky-500 mt-5 text-white rounded-sm px-3 py-2'>Get Started</Link>
        <Image src='/earth.png' alt='earth' className='rotating' width={700} height={700}/>
    </div>
      
    </div>
    </>
  )
}

export default LandingPage
