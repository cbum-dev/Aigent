"use client"
import React, { useState } from 'react'

function page() {

    return (
        <div className='h-screen w-screen flex items-center justify-center bg-gray-800'>
            <Name1 />
            {/* <Name op={"edrfghjk"} /> */}

        </div>
    )
}
function Name1() {
        const [number, setNumber] = useState(" hello")
    function randomNumer() {
        setNumber(Math.random())
    }
    return (
        <div>
            <p className='bg-white'>hellohhbh {number}</p>
                        <button className='' onClick={randomNumer}>hi</button>
                        <br />
                        <br />
                        <br />
            <Name op={"tgyuik"} />
            <Name op={"edrfghjk"} />
            <Name op={"edrfghjk"} />
            <Name op={"edrfghjk"} />
            <br />
            <Wrapper>
                <Name op = {
                "cndj"}/>
            </Wrapper>
        </div>
    )
}

const Wrapper = ({children}) => {
    return(
<div>
    {children}
</div>
    )
}
const Name = React.memo(
    function Name({op}) {
    return (
        <div>
            <p className='bg-white'>hellohhbh{op}</p>
        </div>
    )
}
)
export default page