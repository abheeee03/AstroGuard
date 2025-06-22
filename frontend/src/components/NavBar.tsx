import React from 'react'
import ModeToggle from './theme-switcher'
import { Instrument_Serif } from 'next/font/google'
import Link from 'next/link'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
})

function NavBar() {
  return (
    <div className='fixed w-full flex items-center justify-between backdrop-blur-lg px-20 py-4'>
        <Link href='/' className={`text-2xl ${instrumentSerif.className}`}>AstroGuard</Link>
        <ModeToggle/>
    </div>
  )
}

export default NavBar