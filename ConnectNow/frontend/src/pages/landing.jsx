// Adapted and customized for ConnectNOW
import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
export default function LandingPage() {


    const router = useNavigate();

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>ConnectNOW</h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => {
                        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
                        let p1 = "", p2 = "", p3 = "";
                        for (let i = 0; i < 3; i++) {
                            p1 += chars.charAt(Math.floor(Math.random() * chars.length));
                            p2 += chars.charAt(Math.floor(Math.random() * chars.length));
                            p3 += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        router(`/${p1}-${p2}-${p3}`);
                    }} className="cursor-pointer hover:text-orange-400">Join as Guest</p>
                    <p onClick={() => {
                        router("/auth")

                    }}>Register</p>
                    <div onClick={() => {
                        router("/auth")

                    }} role='button'>
                        <p>Login</p>
                    </div>
                </div>
            </nav>


            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones</h1>

                    <p>Cover the distance with ConnectNOW</p>
                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>

                    <img src="/mobile.png" alt="" />

                </div>
            </div>



        </div>
    )
}
