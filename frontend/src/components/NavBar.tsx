import React from 'react'
import ModeToggle from './theme-switcher'

function NavBar() {
  return (
    <div className='fixed w-full flex items-center justify-between px-20 py-5'>
        <h1 className='text-xl'>AstroGuard</h1>
        <ModeToggle/>

    </div>
  )
}

export default NavBar