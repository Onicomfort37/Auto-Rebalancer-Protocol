;; Automated Portfolio Rebalancing System
;; A smart contract for automatic portfolio rebalancing based on target allocations

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-ASSET (err u101))
(define-constant ERR-INVALID-ALLOCATION (err u102))
(define-constant ERR-INSUFFICIENT-BALANCE (err u103))
(define-constant ERR-REBALANCE-NOT-NEEDED (err u104))
(define-constant ERR-ASSET-EXISTS (err u105))
(define-constant ERR-PORTFOLIO-NOT-FOUND (err u106))

;; Contract owner
(define-constant CONTRACT-OWNER tx-sender)

;; Data structures
(define-map portfolios 
  principal 
  {
    total-value: uint,
    last-rebalance: uint,
    rebalance-threshold: uint, ;; percentage threshold for rebalancing (e.g., 500 = 5%)
    auto-rebalance-enabled: bool
  }
)

(define-map portfolio-assets 
  {owner: principal, asset-id: uint} 
  {
    current-amount: uint,
    target-allocation: uint, ;; percentage allocation (e.g., 3000 = 30%)
    current-allocation: uint,
    asset-name: (string-ascii 64)
  }
)

(define-map asset-prices 
  uint 
  {
    price: uint,
    last-updated: uint
  }
)

;; Portfolio management functions

;; Create a new portfolio
(define-public (create-portfolio (rebalance-threshold uint))
  (begin
    (asserts! (is-none (map-get? portfolios tx-sender)) ERR-PORTFOLIO-NOT-FOUND)
    (asserts! (<= rebalance-threshold u10000) ERR-INVALID-ALLOCATION) ;; max 100%
    (map-set portfolios tx-sender {
      total-value: u0,
      last-rebalance: stacks-block-height,
      rebalance-threshold: rebalance-threshold,
      auto-rebalance-enabled: true
    })
    (ok true)
  )
)

;; Add asset to portfolio
(define-public (add-asset (asset-id uint) (target-allocation uint) (initial-amount uint) (asset-name (string-ascii 64)))
  (let ((portfolio (unwrap! (map-get? portfolios tx-sender) ERR-PORTFOLIO-NOT-FOUND)))
    (asserts! (is-none (map-get? portfolio-assets {owner: tx-sender, asset-id: asset-id})) ERR-ASSET-EXISTS)
    (asserts! (<= target-allocation u10000) ERR-INVALID-ALLOCATION) ;; max 100%
    (map-set portfolio-assets {owner: tx-sender, asset-id: asset-id} {
      current-amount: initial-amount,
      target-allocation: target-allocation,
      current-allocation: u0,
      asset-name: asset-name
    })
    (ok true)
  )
)

;; Update asset price (typically called by an oracle)
(define-public (update-asset-price (asset-id uint) (new-price uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (map-set asset-prices asset-id {
      price: new-price,
      last-updated: stacks-block-height
    })
    (ok true)
  )
)

;; Calculate portfolio value
(define-private (calculate-portfolio-value (owner principal))
  (let ((asset-ids (list u1 u2 u3 u4 u5))) ;; Support up to 5 assets for simplicity
    (fold calculate-asset-value asset-ids {owner: owner, total: u0})
  )
)

(define-private (calculate-asset-value (asset-id uint) (acc {owner: principal, total: uint}))
  (match (map-get? portfolio-assets {owner: (get owner acc), asset-id: asset-id})
    asset-info
    (match (map-get? asset-prices asset-id)
      price-info
      {
        owner: (get owner acc),
        total: (+ (get total acc) (* (get current-amount asset-info) (get price price-info)))
      }
      acc
    )
    acc
  )
)

;; Check if rebalancing is needed
(define-public (check-rebalance-needed (owner principal))
  (let (
    (portfolio (unwrap! (map-get? portfolios owner) ERR-PORTFOLIO-NOT-FOUND))
    (portfolio-value (get total (calculate-portfolio-value owner)))
  )
    (if (> portfolio-value u0)
      (let ((needs-rebalance (check-allocation-drift owner portfolio-value (get rebalance-threshold portfolio))))
        (ok needs-rebalance)
      )
      (ok false)
    )
  )
)

;; Check allocation drift for all assets - FIXED VERSION
(define-private (check-allocation-drift (owner principal) (total-value uint) (threshold uint))
  (let ((asset-ids (list u1 u2 u3 u4 u5)))
    (> (get max-drift (fold check-single-asset-drift-wrapper asset-ids {owner: owner, total-value: total-value, max-drift: u0, threshold: threshold}))
       threshold
    )
  )
)

;; Helper function to wrap the drift check for fold
(define-private (check-single-asset-drift-wrapper (asset-id uint) (acc {owner: principal, total-value: uint, max-drift: uint, threshold: uint}))
  (let ((current-drift (check-single-asset-drift-for-id (get owner acc) asset-id (get total-value acc))))
    {
      owner: (get owner acc),
      total-value: (get total-value acc),
      max-drift: (if (> current-drift (get max-drift acc)) current-drift (get max-drift acc)),
      threshold: (get threshold acc)
    }
  )
)

(define-private (check-single-asset-drift-for-id (owner principal) (asset-id uint) (total-value uint))
  (match (map-get? portfolio-assets {owner: owner, asset-id: asset-id})
    asset-info
    (match (map-get? asset-prices asset-id)
      price-info
      (let (
        (current-value (* (get current-amount asset-info) (get price price-info)))
        (current-allocation (/ (* current-value u10000) total-value))
        (target-allocation (get target-allocation asset-info))
        (drift (if (> current-allocation target-allocation)
                  (- current-allocation target-allocation)
                  (- target-allocation current-allocation)
               ))
      )
        drift
      )
      u0
    )
    u0
  )
)

;; Execute rebalancing
(define-public (execute-rebalance)
  (let (
    (portfolio (unwrap! (map-get? portfolios tx-sender) ERR-PORTFOLIO-NOT-FOUND))
    (portfolio-value (get total (calculate-portfolio-value tx-sender)))
  )
    (asserts! (get auto-rebalance-enabled portfolio) ERR-NOT-AUTHORIZED)
    (asserts! (unwrap! (check-rebalance-needed tx-sender) ERR-REBALANCE-NOT-NEEDED) ERR-REBALANCE-NOT-NEEDED)
    
    ;; Update last rebalance time
    (map-set portfolios tx-sender (merge portfolio {
      last-rebalance: stacks-block-height,
      total-value: portfolio-value
    }))
    
    ;; Rebalance assets (simplified - in practice would involve actual trading)
    (rebalance-assets tx-sender portfolio-value)
    (ok true)
  )
)

;; Rebalance assets to target allocations
(define-private (rebalance-assets (owner principal) (total-value uint))
  (let ((asset-ids (list u1 u2 u3 u4 u5)))
    (fold rebalance-single-asset-wrapper asset-ids {owner: owner, total-value: total-value})
    true
  )
)

(define-private (rebalance-single-asset-wrapper (asset-id uint) (acc {owner: principal, total-value: uint}))
  (begin
    (rebalance-single-asset (get owner acc) asset-id (get total-value acc))
    acc
  )
)

(define-private (rebalance-single-asset (owner principal) (asset-id uint) (total-value uint))
  (match (map-get? portfolio-assets {owner: owner, asset-id: asset-id})
    asset-info
    (match (map-get? asset-prices asset-id)
      price-info
      (let (
        (target-value (/ (* total-value (get target-allocation asset-info)) u10000))
        (target-amount (/ target-value (get price price-info)))
      )
        (map-set portfolio-assets {owner: owner, asset-id: asset-id} (merge asset-info {
          current-amount: target-amount,
          current-allocation: (get target-allocation asset-info)
        }))
      )
      false
    )
    false
  )
)

;; Enable/disable auto-rebalancing
(define-public (set-auto-rebalance (enabled bool))
  (let ((portfolio (unwrap! (map-get? portfolios tx-sender) ERR-PORTFOLIO-NOT-FOUND)))
    (map-set portfolios tx-sender (merge portfolio {auto-rebalance-enabled: enabled}))
    (ok true)
  )
)

;; Update rebalance threshold
(define-public (update-rebalance-threshold (new-threshold uint))
  (let ((portfolio (unwrap! (map-get? portfolios tx-sender) ERR-PORTFOLIO-NOT-FOUND)))
    (asserts! (<= new-threshold u10000) ERR-INVALID-ALLOCATION)
    (map-set portfolios tx-sender (merge portfolio {rebalance-threshold: new-threshold}))
    (ok true)
  )
)

;; Read-only functions

;; Get portfolio info
(define-read-only (get-portfolio (owner principal))
  (map-get? portfolios owner)
)

;; Get asset info
(define-read-only (get-asset (owner principal) (asset-id uint))
  (map-get? portfolio-assets {owner: owner, asset-id: asset-id})
)

;; Get asset price
(define-read-only (get-asset-price (asset-id uint))
  (map-get? asset-prices asset-id)
)

;; Get current portfolio allocation
(define-read-only (get-current-allocations (owner principal))
  (let (
    (portfolio-value (get total (calculate-portfolio-value owner)))
    (asset-ids (list u1 u2 u3 u4 u5))
  )
    (if (> portfolio-value u0)
      (ok (get allocations (fold get-asset-allocation-wrapper asset-ids {owner: owner, total-value: portfolio-value, allocations: (list)})))
      (ok (list {asset-id: u0, asset-name: "", current-allocation: u0, target-allocation: u0, current-amount: u0}))
    )
  )
)

(define-private (get-asset-allocation-wrapper (asset-id uint) (acc {owner: principal, total-value: uint, allocations: (list 100 {asset-id: uint, asset-name: (string-ascii 64), current-allocation: uint, target-allocation: uint, current-amount: uint})}))
  (let ((allocation-info (get-asset-allocation (get owner acc) asset-id (get total-value acc))))
    {
      owner: (get owner acc),
      total-value: (get total-value acc),
      allocations: (unwrap-panic (as-max-len? (append (get allocations acc) allocation-info) u100))
    }
  )
)

(define-private (get-asset-allocation (owner principal) (asset-id uint) (total-value uint))
  (match (map-get? portfolio-assets {owner: owner, asset-id: asset-id})
    asset-info
    (match (map-get? asset-prices asset-id)
      price-info
      (let (
        (current-value (* (get current-amount asset-info) (get price price-info)))
        (current-allocation (/ (* current-value u10000) total-value))
      )
        {
          asset-id: asset-id,
          asset-name: (get asset-name asset-info),
          current-allocation: current-allocation,
          target-allocation: (get target-allocation asset-info),
          current-amount: (get current-amount asset-info)
        }
      )
      {asset-id: asset-id, asset-name: "", current-allocation: u0, target-allocation: u0, current-amount: u0}
    )
    {asset-id: asset-id, asset-name: "", current-allocation: u0, target-allocation: u0, current-amount: u0}
  )
)
