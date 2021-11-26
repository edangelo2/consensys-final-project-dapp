/* pages/_app.js */
import '../styles/globals.css'
import Link from 'next/link'

function DAudit({ Component, pageProps }) {
  return (
    <div className="container w-full sm"> 
      <nav className="border-b-4 p-6 ">
        <p className="text-4xl font-bold text-green-700">Decentralized Audits</p>
        <div className="flex mt-4">
          <Link href="/">
            <a className="mr-4 text-green-700">
              Home
            </a>
          </Link>
          <Link href="/create-audit">
            <a className="mr-6 text-green-700">
              Submit Audit Items
            </a>
          </Link>
          <Link href="/blockchain-view">
            <a className="mr-6 text-green-700">
              Blockchain
            </a>
          </Link>
        </div>
      </nav>
      <Component {...pageProps} />
    </div>
  )
}

export default DAudit