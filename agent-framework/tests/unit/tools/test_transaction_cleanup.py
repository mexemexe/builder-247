import pytest
from datetime import datetime, timedelta
from prometheus_swarm.tools.transaction_operations.cleanup import TransactionIdCleaner

def test_cleanup_old_transaction_ids():
    """Test cleaning up transaction IDs based on age."""
    current_time = datetime.now()
    
    # Create transaction IDs with different ages
    old_tx1 = f"tx_old1_{(current_time - timedelta(hours=25)).isoformat()}"
    old_tx2 = f"tx_old2_{(current_time - timedelta(hours=30)).isoformat()}"
    recent_tx1 = f"tx_recent1_{(current_time - timedelta(hours=12)).isoformat()}"
    recent_tx2 = f"tx_recent2_{(current_time - timedelta(hours=6)).isoformat()}"
    
    transaction_ids = [old_tx1, old_tx2, recent_tx1, recent_tx2]
    
    cleaned_ids = TransactionIdCleaner.cleanup_old_transaction_ids(transaction_ids, max_age_hours=24)
    
    assert len(cleaned_ids) == 2
    assert recent_tx1 in cleaned_ids
    assert recent_tx2 in cleaned_ids
    assert old_tx1 not in cleaned_ids
    assert old_tx2 not in cleaned_ids

def test_generate_transaction_id():
    """Test transaction ID generation."""
    # Test basic generation
    tx_id1 = TransactionIdCleaner.generate_transaction_id()
    assert isinstance(tx_id1, str)
    assert len(tx_id1) > 0
    
    # Test generation with prefix
    tx_id2 = TransactionIdCleaner.generate_transaction_id(prefix="custom")
    assert tx_id2.startswith("custom_")

def test_cleanup_with_invalid_transaction_ids():
    """Test cleanup with invalid transaction IDs."""
    invalid_ids = ["invalid1", "invalid2", "not_a_timestamp"]
    
    cleaned_ids = TransactionIdCleaner.cleanup_old_transaction_ids(invalid_ids)
    
    # Should return an empty list or log warning
    assert len(cleaned_ids) == 0 or len(cleaned_ids) == len(invalid_ids)

def test_max_age_edge_cases():
    """Test various max age scenarios."""
    current_time = datetime.now()
    
    # Test 0 hours max age
    tx_zero_age = f"tx_zero_{current_time.isoformat()}"
    cleaned_zero = TransactionIdCleaner.cleanup_old_transaction_ids([tx_zero_age], max_age_hours=0)
    assert len(cleaned_zero) == 0
    
    # Test very large max age with a transaction from a year ago
    old_year_tx = f"tx_large_{(current_time - timedelta(days=365)).isoformat()}"
    recent_month_tx = f"tx_recent_{(current_time - timedelta(days=60)).isoformat()}"
    
    # With a very large max_age (e.g., 9000 hours), both older transactions are kept
    cleaned_large = TransactionIdCleaner.cleanup_old_transaction_ids(
        [old_year_tx, recent_month_tx], 
        max_age_hours=9000
    )
    
    # Both transactions should be kept
    assert len(cleaned_large) == 2, f"Cleaned transactions: {cleaned_large}"