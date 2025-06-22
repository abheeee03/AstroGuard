'use client'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import React from 'react'

function ModeToggle() {
  const { theme, setTheme } = useTheme()
    return (
    <div>
        {
            theme === 'dark' ? <button className='cursor-pointer' onClick={() => setTheme('light')}>
                <SunIcon/>
            </button> : <button className='cursor-pointer' onClick={() => setTheme('dark')}>
                <MoonIcon/>
            </button>
        }
    </div>
  )
}

export default ModeToggle