// pages/producer-audits.js //
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from "web3modal"

import {
  DAuditaddress, auditItemAddress
} from '../config'

import AuditItem from '../contracts/AuditItem.json'
import DAudit from '../contracts/DAudit.json'


export default function MyAssets() {
  const auditItemStatuses = ['Pending','InProgress', 'Passed', 'Failed', 'Cancelled']  
  const [auditItems, setAuditItems] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  useEffect(() => {
    loadAuditItems()
  }, [])
  async function loadAuditItems() {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
      
    const marketContract = new ethers.Contract(DAuditaddress, DAudit.abi, signer)
    const tokenContract = new ethers.Contract(auditItemAddress, AuditItem.abi, provider)
    const data = await marketContract.fetchMyAudits()
    
    const items = await Promise.all(data.map(async i => {
      const tokenUri = await tokenContract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      let auditFee = ethers.utils.formatUnits(i.auditFee.toString(), 'ether')
      let listingFee = ethers.utils.formatUnits(i.listingFee.toString(), 'ether')
      let totalFee = i.auditFee.add(i.listingFee) ;
      let totalFeeStr = ethers.utils.formatUnits(totalFee.toString(), 'ether')
      let item = {
        auditFee,
        tokenId: i.tokenId.toNumber(),
        producer: i.producer.toString(),
        owner: i.owner,
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description,
        listingFee,
        totalFee: totalFeeStr,
        auditItemStatus: i.auditItemStatus
      }
      return item
    }))
    setAuditItems(items)
    setLoadingState('loaded') 
  }
  if (loadingState === 'loaded' && !auditItems.length) return (<h1 className="py-10 px-20 text-3xl">No assets owned</h1>)
  return (
    <div className="flex justify-center">
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {
            auditItems.map((aItem, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <img src={aItem.image} className="rounded" />
                <div className="p-4 bg-black">
                  <p className="text-2xl font-bold text-white">{aItem.name}</p>
                  <p className="text-xl font-italic text-white">{aItem.description}</p>
                </div>
                <div className="p-4 bg-green-400">
                <p className="text-base font-mono font-bold text-white">Audit Fee  : {aItem.auditFee} Eth</p>
                <p className="text-base font-mono font-bold text-white">Listing Fee  : {aItem.listingFee} Eth</p>
                <p className="text-base font-mono font-bold text-white">Total Audit Fee - {aItem.totalFee} Eth</p>
                <p className="text-xl p-6 font-mono font-bold text-white text-center">  
                    <span className="px-6 inline-flex text-base leading-5 font-semibold rounded-full bg-green-100 text-green-800 text-2xl">{auditItemStatuses[aItem.auditItemStatus]}</span>
                </p>
                <p className="text-base font-mono font-bold text-white">Producer  : {aItem.producer}</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}