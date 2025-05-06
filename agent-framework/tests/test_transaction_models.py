import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from prometheus_swarm.database.transaction_models import Base, Transaction, TransactionAudit
from datetime import datetime, UTC, timedelta

@pytest.fixture(scope='function')
def engine():
    """Create an in-memory SQLite database for testing."""
    return create_engine('sqlite:///:memory:')

@pytest.fixture(scope='function')
def tables(engine):
    """Create tables in the test database."""
    Base.metadata.create_all(engine)
    return Base.metadata.tables

@pytest.fixture(scope='function')
def session(engine, tables):
    """Create a database session for testing."""
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_create_transaction(session):
    """Test creating a basic transaction."""
    transaction = Transaction(
        transaction_type='deposit',
        amount=100.50,
        currency='USD',
        status='completed',
        source_account='source123',
        destination_account='dest456',
        is_completed=True
    )
    session.add(transaction)
    session.commit()

    assert transaction.id is not None
    assert transaction.timestamp is not None
    assert transaction.amount == 100.50
    assert transaction.status == 'completed'

def test_transaction_audit(session):
    """Test creating a transaction with an audit trail."""
    transaction = Transaction(
        transaction_type='withdrawal',
        amount=50.00,
        currency='USD',
        status='processing',
        source_account='account789'
    )
    session.add(transaction)
    session.commit()

    audit = TransactionAudit(
        transaction_id=transaction.id,
        action='created',
        actor='system',
        details='Initial transaction creation'
    )
    session.add(audit)
    session.commit()

    assert len(transaction.audits) == 1
    assert transaction.audits[0].action == 'created'
    assert transaction.audits[0].actor == 'system'

def test_transaction_repr(session):
    """Test the string representation of a transaction."""
    transaction = Transaction(
        transaction_type='transfer',
        amount=200.75,
        currency='EUR',
        status='failed',
        error_code='insufficient_funds'
    )
    session.add(transaction)
    session.commit()

    repr_str = repr(transaction)
    assert 'Transaction' in repr_str
    assert 'transfer' in repr_str
    assert '200.75' in repr_str
    assert 'failed' in repr_str

def test_transaction_error_handling(session):
    """Test transaction with error details."""
    transaction = Transaction(
        transaction_type='deposit',
        amount=500.00,
        currency='USD',
        status='error',
        is_completed=False,
        error_code='network_issue'
    )
    session.add(transaction)
    session.commit()

    assert transaction.status == 'error'
    assert not transaction.is_completed
    assert transaction.error_code == 'network_issue'

def test_transaction_timestamp(session):
    """Test transaction timestamp behavior."""
    now = datetime.now(UTC)
    transaction = Transaction(
        transaction_type='withdrawal',
        amount=75.25,
        currency='GBP',
        status='completed'
    )
    session.add(transaction)
    session.commit()

    # Check that timestamp is close to current time
    assert transaction.timestamp.tzinfo is not None
    assert transaction.timestamp >= now - timedelta(seconds=1)
    assert transaction.timestamp <= now + timedelta(seconds=1)