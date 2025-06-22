import NavBar from '@/components/NavBar'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

function LandingPage() {
  return (
    <>
    <NavBar/>
    <div className="min-h-screen w-full">
    <div className='h-screen w-full gap-10 flex flex-col items-center justify-center'>
  
      <h3 className='border rounded-xl border-primary px-2'>Introducing</h3>
      <h1 className='text-6xl font-bold'>Astro Guard</h1>
      <Link href='/home' className='bg-sky-500 text-white rounded-xl px-2 py-2'>Start Detection</Link>
      <div className="">
        {/* <Image src='/earth.png' alt='earth' width={500} height={500}/> */}
      </div>
    </div>
    </div>
    </>
  )
}

export default LandingPage
