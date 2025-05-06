from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone

Base = declarative_base()

def get_utc_time():
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)

class Transaction(Base):
    """
    Represents a financial or system transaction with comprehensive tracking.
    
    Attributes:
        id (int): Unique identifier for the transaction
        transaction_type (str): Type of transaction (e.g., 'deposit', 'withdrawal', 'transfer')
        amount (float): Transaction amount
        currency (str): Currency of the transaction
        status (str): Current status of the transaction
        timestamp (DateTime): Timestamp of the transaction
        source_account (str): Source account identifier
        destination_account (str): Destination account identifier
        description (str): Optional description of the transaction
        is_completed (bool): Flag indicating transaction completion
        error_code (str, optional): Error code if transaction failed
    """
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True)
    transaction_type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)
    status = Column(String(50), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=get_utc_time)
    source_account = Column(String(100))
    destination_account = Column(String(100))
    description = Column(String(255))
    is_completed = Column(Boolean, default=False)
    error_code = Column(String(50))

    audits = relationship("TransactionAudit", back_populates="transaction")

    def __repr__(self):
        """String representation of the Transaction."""
        return (f"&lt;Transaction(id={self.id}, type={self.transaction_type}, "
                f"amount={self.amount}, status={self.status})&gt;")

class TransactionAudit(Base):
    """
    Tracks audit information for transactions to maintain a comprehensive log.
    
    Attributes:
        id (int): Unique identifier for the audit entry
        transaction_id (int): Foreign key to the original transaction
        action (str): Type of audit action (e.g., 'created', 'updated', 'failed')
        actor (str): Entity or user who performed the action
        timestamp (DateTime): Timestamp of the audit entry
        details (str): Additional details about the audit action
    """
    __tablename__ = 'transaction_audits'

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey('transactions.id'))
    action = Column(String(50), nullable=False)
    actor = Column(String(100), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=get_utc_time)
    details = Column(String(255))

    transaction = relationship("Transaction", back_populates="audits")

    def __repr__(self):
        """String representation of the TransactionAudit."""
        return (f"&lt;TransactionAudit(id={self.id}, transaction_id={self.transaction_id}, "
                f"action={self.action}, actor={self.actor})&gt;")