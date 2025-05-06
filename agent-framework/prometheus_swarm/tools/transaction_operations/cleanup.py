import logging
from typing import List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TransactionIdCleaner:
    """
    A utility class for managing and cleaning up transaction IDs.
    
    This class provides methods to track, filter, and clean up transaction IDs
    based on age and other criteria.
    """
    
    @staticmethod
    def cleanup_old_transaction_ids(
        transaction_ids: List[str], 
        max_age_hours: int = 24
    ) -> List[str]:
        """
        Clean up transaction IDs older than a specified time threshold.
        
        Args:
            transaction_ids (List[str]): List of transaction IDs to process
            max_age_hours (int, optional): Maximum age in hours before a transaction 
                                           is considered stale. Defaults to 24.
        
        Returns:
            List[str]: Filtered list of valid transaction IDs
        
        Logs:
            - Number of transactions before cleanup
            - Number of transactions after cleanup
            - Details of removed transactions
        """
        try:
            logger.info(f"Starting transaction ID cleanup (max age: {max_age_hours} hours)")
            logger.info(f"Total transactions before cleanup: {len(transaction_ids)}")
            
            current_time = datetime.now()
            valid_transaction_ids = []
            removed_transactions = []
            
            for tx_id in transaction_ids:
                try:
                    # Assuming transaction ID includes timestamp information
                    # This is a placeholder and should be adapted to your actual transaction ID format
                    tx_timestamp = datetime.fromisoformat(tx_id.split('_')[-1])
                    age = current_time - tx_timestamp
                    
                    if age <= timedelta(hours=max_age_hours):
                        valid_transaction_ids.append(tx_id)
                    else:
                        removed_transactions.append(tx_id)
                        logger.debug(f"Removing stale transaction ID: {tx_id}")
                
                except (ValueError, IndexError) as parsing_error:
                    logger.warning(f"Could not parse transaction ID {tx_id}: {parsing_error}")
            
            logger.info(f"Transactions after cleanup: {len(valid_transaction_ids)}")
            logger.info(f"Removed {len(removed_transactions)} stale transactions")
            
            return valid_transaction_ids
        
        except Exception as e:
            logger.error(f"Unexpected error during transaction ID cleanup: {e}")
            return transaction_ids  # Return original list if cleanup fails
    
    @staticmethod
    def generate_transaction_id(prefix: Optional[str] = None) -> str:
        """
        Generate a new transaction ID with optional prefix and timestamp.
        
        Args:
            prefix (str, optional): Optional prefix for the transaction ID
        
        Returns:
            str: A unique transaction ID
        """
        timestamp = datetime.now().isoformat()
        transaction_id = f"{prefix or 'tx'}_{timestamp}" if prefix else timestamp
        
        logger.info(f"Generated new transaction ID: {transaction_id}")
        return transaction_id