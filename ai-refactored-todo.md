# The Spark Project
_Emergent Framework Mapping (AI Generated)_

## Milestone
### Phase 1A
### Phase 1B
### Phase 2
### Phase 3
### Post-Provisioning

## Technical Domain
### Network
### Compute
### Storage
### Security
### Big Data
### Remote Access

## Actor
### fqdn-Network
### fqdn-Infrastructure
### fqdn-Cyber
### Vendor-Ksolves

## Deliverable Type
### Architecture Doc
### Ansible Playbook
### Hardware Install
### Vendor Correspondence
### Audit Log

## Operational State
### Blocked
### Pending Vendor
### In Progress
### Closed

# Master Log

- [x] Establish Ksolves Webex desktop access for Phase 1A interim infrastructure provisioning [Phase 1A] [Remote Access] [Vendor-Ksolves] [Vendor Correspondence] [Closed]
  - Phase 1A (interim): Shared Webex desktop with fqdn team oversight — **was active; now blocked**
  - Phase 1B (permanent): VMware Horizon VDI — still pending fqdn Cyber Security approval (tracked under Pending Tasks > Correspondence; non-blocking for Phase 1/2 work)
  - See: phases/development/phase2/Document/Phases_Critical_Path_Development_v1.3.md § BLOCKER.1

- [x] Phase 1A re-opened 2026-04-30 — Ksolves must provision Windows host (vendor-side, in India) to run Webex Desktop client with remote control enabled [Phase 1A] [Remote Access] [Vendor-Ksolves] [Vendor Correspondence] [Closed]
  - Cause: Webex's Linux desktop client does not support remote control of a Windows Webex share (verified by user — set up Linux Webex and confirmed remote-control unavailable). Ksolves is a Linux shop; fqdn shares from Windows. Without a Windows host on Ksolves' side, Phase 1A cannot proceed.
  - Vendor responsibility: Ksolves provisions and maintains the Windows host on their side (in India)
  - Vendor sub-tasks:
    - [x] Ksolves provisions Windows host capable of running Webex Desktop with remote-control support [Vendor-Ksolves] [Hardware Install]
    - [x] Ksolves installs and licenses Webex Desktop on the Windows host [Vendor-Ksolves]
    - [x] Joint connectivity test: Ksolves' Windows host → fqdn-shared Windows Webex session, with remote-control verified [fqdn-Infrastructure] [Vendor-Ksolves]
    - [x] Ksolves notifies fqdn when Windows host is ready, so Phase 1A kickoff can be scheduled [Vendor Correspondence]

- [x] Rotate exposed iLO administrator credentials [Phase 1A] [Security] [Compute] [fqdn-Infrastructure] [Audit Log] [Closed]
  - The iLO admin password used by Ksolves on `msb-pmc03-01-ilo` (10.1.32.64) appears in plain text inside the vendor's bash history. Rotate the iLO password on all three msb-pmc03 nodes; if the same credential is reused for any corporate-AD account, rotate that as well; scrub `~/.bash_history` on each node (and any vendor workstation copies); coordinate with corporate IT.
  - Source: `phases/development/phase2/Incoming/Archive/ksolves_node1_commands.txt` (occurrences at lines 82–87, 121, 138–142, 168–172) — moved to Archive/ 2026-05-11
