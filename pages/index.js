/* pages/index.js */
/* Ethers library for connecting to the Blockchain */ 
import { ethers } from 'ethers'
/* React Componentes used
* useEffect for invoking functions when the components load
* useState for mantaining local state of the Dapp
 */
import { useEffect, useState } from 'react'
/* 
* Axios offers a get method with at least one argument (url) to fetch data.
* the data returned is an array, we map through the array 
* and then get the data we want to display and display it at the appropriate element.
*/
import axios from 'axios'
import Link from 'next/link';

/* Ethereum provider solution for all Wallets
* Web3Modal is an easy-to-use library to help developers 
* add support for multiple providers in their apps with a simple customizable configuration
*/
import Web3Modal from "web3modal"

/*
* Imports the SmartContracts addresses from configuration file
*/
import {
  auditItemAddress, DAuditaddress
} from '../config'

import AuditItem from '../contracts/AuditItem.json'
import DAudit from '../contracts/DAudit.json'


export default function Home() {
  const auditItemStatuses = ['Pending','In Progress', 'Passed', 'Failed', 'Cancelled']  
  const [AuditItems, setAuditItems] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [metaMask, setMetaMask] = useState('installed')
  useEffect(() => {
    loadAuditItems()
  }, [])
  
    
  async function loadAuditItems() {

    /* Check the presence of Metamask */
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      setMetaMask('not-installed')
      return
    } 

    /* create a generic provider and query for pending audit items */
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const auditItemContract = new ethers.Contract(auditItemAddress, AuditItem.abi, provider)
    const DAuditContract = new ethers.Contract(DAuditaddress, DAudit.abi, provider)
    const data = await DAuditContract.fetchAudits()
    
    /*
    *  map over items returned from smart contract and format 
    *  them as well as fetch their token metadata
    */
    const items = await Promise.all(data.map(async i => {
      const tokenUri = await auditItemContract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      let auditFee = ethers.utils.formatUnits(i.auditFee.toString(), 'ether')
      let item = {
        auditFee,
        tokenId: i.tokenId.toNumber(),
        producer: i.producer,
        owner: i.owner,
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description,
        auditReqs: i.auditorReq,
        auditItemStatus: i.auditItemStatus,
      }
      return item
    }))
    setAuditItems(items)
    setLoadingState('loaded') 
  
  }
  if (metaMask === 'not-installed') return (<h1 className="px-20 py-10 text-3xl">MetaMask is not installed</h1>)
  if (loadingState === 'loaded' && !AuditItems.length && metaMask === 'not-installed' ) 
    return (<h1 className="px-20 py-10 text-3xl">No items submitted for audits</h1>)
  
  return (
    <div className="flex flex-col ">
    <div className="-my-2 overflow-x-auto sm:-mx-8 lg:-mx-8 ">
      <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Audit ID
                </th>
                <th
                  scope="col"
                  className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fee
                </th>
                <th
                  scope="col"
                  className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Auditors Req
                </th>
                <th
                  scope="col"
                  className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th scope="col" className="relative px-3 py-1">
                  <span className="sr-only">Enroll</span>
                </th>               
                <th scope="col" className="relative px-3 py-1">
                  <span className="sr-only">Assign</span>
                </th>
                <th scope="col" className="relative px-3 py-1">
                  <span className="sr-only">Pay</span>
                </th>
                <th scope="col" className="relative px-3 py-1">
                  <span className="sr-only">Results</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {
                    AuditItems.map(
                        (AuditItem, i) => 
                            (
                            <tr key={AuditItem.tokenId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{AuditItem.tokenId}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        <img className="h-10 w-10 rounded-full" src={AuditItem.image} alt="" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{AuditItem.name}</div>
                                    </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{AuditItem.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{AuditItem.auditFee} eth</div>
                                </td>                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{AuditItem.auditReqs}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    {auditItemStatuses[AuditItem.auditItemStatus]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={{ pathname: '/enroll-auditor', query: { id: AuditItem.tokenId } }}>
                                    <a  className="text-indigo-600 hover:text-indigo-900">
                                    <button className="w-full bg-green-500 text-white font-bold py-2 px-0 rounded">Enroll Auditor</button>
                                    </a>
                                </Link>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={{ pathname: '/assign-auditors', query: { id: AuditItem.tokenId } }}>
                                    <a  className="text-indigo-600 hover:text-indigo-900">
                                    <button className="w-full bg-green-500 text-white font-bold py-2 px-0 rounded">Assign Auditors</button>
                                    </a>
                                </Link>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={{ pathname: '/submit-results', query: { id: AuditItem.tokenId } }}>
                                    <a  className="text-indigo-600 hover:text-indigo-900">
                                    <button className="w-full bg-green-500 text-white font-bold py-2 px-0 rounded">Submit Results</button>
                                    </a>
                                </Link>
                                </td>                                
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={{ pathname: '/pay-auditors', query: { id: AuditItem.tokenId } }}>
                                    <a  className="text-indigo-600 hover:text-indigo-900">
                                    <button className="w-full bg-green-500 text-white font-bold py-2 px-0 rounded">Pay Auditors</button>
                                    </a>
                                </Link>
                                </td>
                            </tr>
                        )
                    )
                }
            </tbody>
            </table>
        </div>
        </div>
    </div>
    </div>
  )
}
  