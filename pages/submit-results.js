/* pages/submit-results.js */
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

/* Ethereum provider solution for all Wallets
* Web3Modal is an easy-to-use library to help developers 
* add support for multiple providers in their apps with a simple customizable configuration
*/
import Web3Modal from "web3modal"

//  Ipfs client for uploading and downloading files
import { create as ipfsHttpClient } from 'ipfs-http-client'

/*
* Imports the SmartContracts addresses from configuration file
*/
import {
  auditItemAddress, DAuditaddress, auditEnrollments, auditAssignments, auditResultAddress
} from '../config'

import AuditItem from '../contracts/AuditItem.json'
import DAudit from '../contracts/DAudit.json'
import AuditEnrollments from '../contracts/AuditEnrollments.json'
import AuditorAssignments from '../contracts/AuditAssignments.json'
import AuditResult from '../contracts/AuditResult.json'

import {useRouter}  from 'next/router'

// IPFS pinning service from infura
const ipfsClient = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')



export default function SubmitResults() {
 // Variables for loading the files  
 const [fileUrl, setFileUrl] = useState(null)
 // Variables for local state of the page in the form (form)
 const [formInput, updateFormInput] = useState({ name: '', description: '', auditResult: '1' })
 
 // Function for uploading the file
 async function onChange(e) {
   // receives an event with an array of files, pick up the first  
   const file = e.target.files[0]
   try {
     // adds the file to the IPFS thrugh the IPFS client  
     const added = await ipfsClient.add(
       file,
       // Logs the progress of file uploaded in the console
       {
         progress: (prog) => console.log(`received: ${prog}`)
       }
     )
     // saves the IPFS URL returned by the IPFS client
     const url = `https://ipfs.infura.io/ipfs/${added.path}`

     // Set file url to the state variable
     setFileUrl(url)
   } catch (error) {
     console.log('Error uploading file: ', error)
   }  
 }

// router hook
const router = useRouter()
const { id } = router.query

const [AItem, setAItem] = useState([])
const [EnrollAddr, setEnrollAddr] = useState([])
const [AssignAddr, setAssignAddr] = useState([])
const [loadingState, setLoadingState] = useState('not-loaded')
const auditItemStatuses = ['Pending','InProgress', 'Passed', 'Failed', 'Cancelled']  

useEffect(() => {
  loadAuditItems()
}, [])

  async function loadAuditItems() {

    //const provider = new ethers.providers.JsonRpcProvider()
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const auditItemContract = new ethers.Contract(auditItemAddress, AuditItem.abi, provider)
    const DAuditContract = new ethers.Contract(DAuditaddress, DAudit.abi, provider)

    const i = await DAuditContract.fetchAuditByTokenId(id) 
    
    /*
    *  map over items returned from smart contract and format 
    *  them as well as fetch their token metadata
    */
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
    setAItem(item)
    
    const provider2 = new ethers.providers.Web3Provider(window.ethereum);
    const contract2 = new ethers.Contract(auditEnrollments, AuditEnrollments.abi, provider2)
    const isAuditEnrolled = await contract2.isAuditEnrolled(i.tokenId)

    /* Gets the list of auditors enrrolled, if any */
    if(isAuditEnrolled) {
      let EnrollData1 = await contract2.getAuditEnrollment(id)
      setEnrollAddr(EnrollData1.auditors)  
    }

    /* Gets the list of auditors assigned, if any */
    const provider3 = new ethers.providers.Web3Provider(window.ethereum);
    const contract3 = new ethers.Contract(auditAssignments, AuditorAssignments.abi, provider3)
    const isAuditAssigned = await contract3.isAuditAssigned(i.tokenId)

    if(isAuditAssigned) {
      let AssignData1 = await contract3.getAuditAssignment(id)
      setAssignAddr(AssignData1.auditors)  
    }

    setLoadingState('loaded') 
  }
  async function createAuditRes() {

    const {name, description, auditResult } = formInput

    // check that are non-empty
    if ( !name || !description || !fileUrl) return
    // Build the metaData as a JSON Object
    const metaData = JSON.stringify({
      name, description, image: fileUrl
    })
    try {
      // Add the metadata through the IPFS Client 
      const added = await ipfsClient.add(metaData)
      // get its url
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      /* after file is uploaded to IPFS, pass the URL to save it on-chain */
      createResult(url,auditResult)
    } catch (error) {
      console.log('Error uploading file: ', error)
    }  
  }

  async function createResult(url,auditResult) {

    // Connect to the wallet
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    // Obtain the wallet provider and the signer of the transaction
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()
   
    /* Create the AuditResult */

    // Reference to the AuditResult Smart Contract
    let contract = new ethers.Contract(auditResultAddress, AuditResult.abi, signer)
    // Call the createToken function to create a new NFT with the url of the image
    let transaction = await contract.createToken(url)
    //Wait for the transaction to succeed
    let tx = await transaction.wait()
    // The tx returns and Event which is an array
    let event = tx.events[0]
    // The second value of the array is the tokenId
    let value = event.args[2]
    // The TokenId is a BigNumber, we convert it to a number
    let tokenId = value.toNumber()

    /* then list the item for audit on DAudit */
    // Reference to the DAudit Smart Contract
    contract = new ethers.Contract(DAuditaddress, DAudit.abi, signer)

    let payFee = 0
    let payFeeStr = payFee.toString()

    let auditResultNbr = parseInt(auditResult)

    // Create the audit result
    transaction = await contract.createAuditResult(auditResultAddress, AItem.tokenId, tokenId, auditResultNbr, { value: payFeeStr })
    await transaction.wait()

    // Send the user to the home page
    router.push('/')
  }
  
  if (loadingState === 'loaded' && AItem.tokenId === null) 
    return (<h1 className="px-20 py-10 text-3xl">No audits to enroll</h1>)
  return (
      <div className="flex ">
        <div className="p-4 ">
          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4 pt-4 ">
            <div key={AItem.Id} className="border shadow rounded-xl overflow-hidden ">
              <img src={AItem.image} className="rounded" />
              <div className="p-4 bg-black">
              <p className="text-lg font-bold text-white">Audit ID  : {id} </p>
                <p className="text-2xl font-bold text-white">{AItem.name}</p>
                <p className="text-xl font-italic text-white">{AItem.description}</p>
              </div>
              <div className="p-4 bg-green-400">
                <p className="text-base font-mono font-bold text-white">Audit Fee  : {AItem.auditFee} eth</p>
                <p className="text-base font-mono font-bold text-white">Auditors required  : {AItem.auditReqs}</p>
                <p className="text-base font-mono font-bold text-white py-2 ">Producer  : </p>
                <p  className="font-mono font-light text-sm text-white py-2">{AItem.producer}</p>

                    <p className="text-base font-mono font-bold text-white py-2">Auditors Enrolled  : </p>
                    {
                    EnrollAddr.map((auditorAddr)=>{
                    return (
                      <p key={auditorAddr} className="font-mono font-light text-sm text-white">{auditorAddr}</p>
                      )
                      })
                    }
                    <p className="text-base font-mono font-bold text-white py-2">Auditors Assigned  : </p>
                    {
                    AssignAddr.map((auditorAddr)=>{
                    return (
                      <p key={auditorAddr} className="font-mono font-light text-sm text-white">{auditorAddr}</p>
                      )
                      })
                    }
              </div>
            </div>
          </div>
        </div>
        <div className="w-1/2 flex justify-start flex-col lg:grid-cols-2 pb-12">
          <input 
            placeholder="Results Name"
            className="mt-8 border rounded p-4"
            onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
          />
          <textarea
            placeholder="Results Description"
            className="mt-2 border rounded p-4"
            onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
          />
          <div className="mt-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="auditResult"
                value="1"
                checked
                onChange={e => updateFormInput({ ...formInput, auditResult: e.target.value })}
              />
              <span className="ml-2">Passed</span>
            </label>
          </div>
          <div>
            <label className="inline-flex items-center">
              <input type="radio" className="form-radio" name="auditResult" value="0" 
              onChange={e => updateFormInput({ ...formInput, auditResult: e.target.value })}
              />
              <span className="ml-2">Failed</span>
            </label>
          </div>
          <input
          type="file"
          name="Asset"
          className="my-4"
          onChange={onChange}
          />
          {
            fileUrl && (
              <img className="rounded mt-4" width="350" src={fileUrl} />
            )
          }
          <button onClick={createAuditRes} className="font-bold mt-4 bg-green-700 text-white rounded p-4 shadow-lg">
            Submit Audit Result
          </button>
        </div>
      </div>
    )
}